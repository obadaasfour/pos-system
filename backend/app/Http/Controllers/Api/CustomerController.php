<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\PaymentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // Standard Store-Scoped Methods (Admin/Cashier)
    // ─────────────────────────────────────────────────────────────

    public function index()
    {
        return Customer::latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:customers,email',
            'address' => 'nullable|string',
        ]);

        $customer = Customer::create($validated);

        return response()->json($customer, 201);
    }

    public function show($id)
    {
        return Customer::with('orders')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        try {
            $customer = Customer::findOrFail($id);
            $validated = $request->validate([
                'name'  => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|unique:customers,email,' . $id,
                'address' => 'nullable|string',
            ]);

            $customer->update($validated);
            return response()->json($customer);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'بيانات غير صالحة', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل التعديل: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $customer = Customer::findOrFail($id);
            if ($customer->total_debt > 0) {
                return response()->json(['message' => 'لا يمكن حذف عميل لديه ديون متبقية.'], 422);
            }
            $customer->delete();
            return response()->json(['message' => 'تم حذف العميل بنجاح.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل الحذف: ' . $e->getMessage()], 500);
        }
    }

    /**
     * تسديد جزء من الدين
     */
    public function settle(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string'
        ]);

        $customer = Customer::findOrFail($id);

        if ($request->amount > $customer->total_debt) {
            return response()->json(['message' => 'المبلغ المدفوع أكبر من إجمالي الدين.'], 422);
        }

        return DB::transaction(function () use ($customer, $request) {
            $customer->decrement('total_debt', $request->amount);

            // سجل في جدول سجلات الدفع الجديدة
            PaymentLog::create([
                'customer_id' => $customer->id,
                'amount'      => $request->amount,
                'description' => $request->description ?? 'تسديد دين العام'
            ]);

            // إضافة للميزانية النقدية
            Setting::updateCashBalance($request->amount);

            return response()->json([
                'message' => 'تم تسديد المبلغ وتحديث الدين بنجاح.',
                'customer' => $customer
            ]);
        });
    }

    /**
     * الحصول على سجل الدفعات للعميل
     */
    public function paymentHistory($id)
    {
        $customer = Customer::with('paymentLogs')->findOrFail($id);
        return $customer->paymentLogs()->latest()->get();
    }


    // ─────────────────────────────────────────────────────────────
    // Super Admin Unrestricted Methods (bypass all store scopes)
    // ─────────────────────────────────────────────────────────────

    /**
     * جلب كل عملاء جميع المتاجر (سوبر أدمن)
     */
    public function indexAll(Request $request)
    {
        $storeId = $request->query('store_id');

        $query = Customer::withoutGlobalScopes()->latest();

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        return response()->json($query->get());
    }

    /**
     * عرض أي عميل بدون قيود (سوبر أدمن)
     */
    public function showAny($id)
    {
        $customer = Customer::withoutGlobalScopes()->with('orders')->findOrFail($id);
        return response()->json($customer);
    }

    /**
     * تعديل أي عميل بدون قيود (سوبر أدمن)
     */
    public function updateAny(Request $request, $id)
    {
        try {
            $customer = Customer::withoutGlobalScopes()->findOrFail($id);

            $validated = $request->validate([
                'name'  => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|unique:customers,email,' . $id,
                'address' => 'nullable|string',
            ]);

            $customer->update($validated);
            return response()->json($customer);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'بيانات غير صالحة', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل التعديل: ' . $e->getMessage()], 500);
        }
    }

    /**
     * حذف أي عميل بدون قيود (سوبر أدمن) — حتى لو لديه ديون
     */
    public function destroyAny($id)
    {
        try {
            $customer = Customer::withoutGlobalScopes()->findOrFail($id);
            $customer->delete();
            return response()->json(['message' => 'تم حذف العميل بنجاح.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل الحذف: ' . $e->getMessage()], 500);
        }
    }

    /**
     * تسديد دين أي عميل (سوبر أدمن)
     */
    public function settleAny(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string'
        ]);

        $customer = Customer::withoutGlobalScopes()->findOrFail($id);

        if ($request->amount > $customer->total_debt) {
            return response()->json(['message' => 'المبلغ المدفوع أكبر من إجمالي الدين.'], 422);
        }

        return DB::transaction(function () use ($customer, $request) {
            $customer->decrement('total_debt', $request->amount);

            PaymentLog::create([
                'customer_id' => $customer->id,
                'amount'      => $request->amount,
                'description' => $request->description ?? 'تسديد من السوبر أدمن'
            ]);

            return response()->json([
                'message'  => 'تم تسديد المبلغ بنجاح.',
                'customer' => $customer
            ]);
        });
    }

    /**
     * سجل دفعات أي عميل (سوبر أدمن)
     */
    public function paymentHistoryAny($id)
    {
        $customer = Customer::withoutGlobalScopes()->with('paymentLogs')->findOrFail($id);
        return $customer->paymentLogs()->latest()->get();
    }
}
