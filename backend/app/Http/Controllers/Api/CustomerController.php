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
        $customer = Customer::findOrFail($id);
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:customers,email,' . $id,
            'address' => 'nullable|string',
        ]);

        $customer->update($validated);
        return response()->json($customer);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        if ($customer->total_debt > 0) {
            return response()->json(['message' => 'لا يمكن حذف عميل لديه ديون.'], 422);
        }
        $customer->delete();
        return response()->json(['message' => 'تم حذف العميل بنجاح.']);
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
}
