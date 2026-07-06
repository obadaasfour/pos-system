<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Order;
use App\Models\User;
use App\Models\ActivityLog;
use App\Services\StoreManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    protected $storeService;

    public function __construct(StoreManagementService $storeService)
    {
        $this->storeService = $storeService;
    }

    /**
     * Get global statistics across all stores.
     */
    public function getStats()
    {
        $totalStores = Store::count();
        $activeStores = Store::where('status', 'active')->count();
        $inactiveStores = $totalStores - $activeStores;

        // Sum of all orders across all stores
        $totalSales = Order::sum('total_amount');

        // Top Store by total sales
        $topStore = Store::withSum('orders', 'total_amount')
            ->orderByDesc('orders_sum_total_amount')
            ->first();

        return response()->json([
            'stats' => [
                'total_stores' => $totalStores,
                'active_stores' => $activeStores,
                'inactive_stores' => $inactiveStores,
                'total_sales' => $totalSales,
                'top_store' => $topStore ? [
                    'name' => $topStore->name,
                    'sales' => $topStore->orders_sum_total_amount ?? 0
                ] : null,
            ]
        ]);
    }

    /**
     * List all stores with metadata.
     */
    public function indexStores()
    {
        return response()->json(Store::withCount(['users', 'products'])->latest()->get());
    }

    /**
     * Create a new store with its primary admin account.
     */
    public function storeStore(Request $request)
    {
        $restrictedSlugs = ['super-admin', 'api', 'login', 'register', 'dashboard', 'admin'];
        
        $slug = strtolower(preg_replace('/[^a-z0-9-]/', '', str_replace(' ', '-', $request->slug)));
        $request->merge(['slug' => $slug]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'required', 
                'string', 
                'unique:stores,slug',
                function ($attribute, $value, $fail) use ($restrictedSlugs) {
                    if (in_array($value, $restrictedSlugs)) {
                        $fail('اسم الرابط (Slug) محجوز للنظام ولا يمكن استخدامه.');
                    }
                },
            ],
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => [
                'required',
                'string',
                \Illuminate\Validation\Rules\Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        try {
            $result = $this->storeService->createStore($validated);

            return response()->json([
                'store' => $result['store'],
                'admin_email' => $result['admin']->email,
            ], 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Store Creation Error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'فشل إنشاء المتجر: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update store details.
     */
    public function updateStore(Request $request, $id)
    {
        $store = Store::findOrFail($id);
        $oldData = $store->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        $store->update($validated);

        ActivityLog::log('edit', "تعديل بيانات المحل: {$store->name}", $oldData, $store->toArray());

        return response()->json($store);
    }

    /**
     * Suspend/Activate store.
     */
    public function toggleStatus(Request $request, $id)
    {
        $store = Store::findOrFail($id);
        $action = $request->input('action'); // 'suspend' or 'activate'

        if ($action === 'suspend') {
            $this->storeService->suspendStore($store);
            return response()->json(['message' => "تم إيقاف المتجر {$store->name} بنجاح", 'status' => 'suspended']);
        } elseif ($action === 'activate') {
            $this->storeService->activateStore($store);
            return response()->json(['message' => "تم تفعيل المتجر {$store->name} بنجاح", 'status' => 'active']);
        }

        return response()->json(['message' => 'إجراء غير صالح'], 400);
    }

    /**
     * Delete a store permanently (Hard Delete).
     */
    public function destroy(Request $request, $id)
    {
        $store = Store::findOrFail($id);
        $this->storeService->hardDeleteStore($store);

        return response()->json(['message' => 'تم حذف الفرع وكافة بياناته بنجاح']);
    }
}
