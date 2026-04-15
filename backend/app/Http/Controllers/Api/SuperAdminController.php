<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Order;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    /**
     * Get global statistics across all stores.
     */
    public function getStats()
    {
        $totalStores = Store::count();
        $activeStores = Store::where('is_active', true)->count();
        $inactiveStores = $totalStores - $activeStores;

        // Sum of all orders across all stores (StoreScope is bypassed for Super Admin)
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
        
        // Normalize slug early
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

        return DB::transaction(function () use ($validated) {
            // 1. Create the Store
            $store = Store::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
            ]);

            // 2. Create the Admin User
            $admin = User::create([
                'store_id' => $store->id,
                'name' => 'مدير المحل: ' . $store->name,
                'email' => $validated['admin_email'],
                'password' => \Illuminate\Support\Facades\Hash::make($validated['admin_password']),
                'role' => User::ROLE_ADMIN,
            ]);

            ActivityLog::log('add', "تم إنشاء محل جديد: {$store->name} مع بريد المدير: {$admin->email}", null, $store->toArray());

            return response()->json([
                'store' => $store,
                'admin_email' => $admin->email,
                'login_url' => '/' . $store->slug . '/login'
            ], 201);
        });
    }

    /**
     * Update store status and details.
     */
    public function updateStore(Request $request, $id)
    {
        $store = Store::findOrFail($id);
        $oldData = $store->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        $store->update($validated);

        ActivityLog::log('edit', "تعديل بيانات المحل: {$store->name}", $oldData, $store->toArray());

        return response()->json($store);
    }

    /**
     * Toggle store active status.
     */
    public function toggleStatus($id)
    {
        $store = Store::findOrFail($id);
        $store->is_active = !$store->is_active;
        $store->save();

        ActivityLog::log('edit', $desc);

        return response()->json(['message' => $desc, 'is_active' => $store->is_active]);
    }

    /**
     * Delete a store permanently (Hard Delete).
     */
    public function destroy(Request $request, $id)
    {
        // 0. Extra security layer on top of middleware
        if ($request->user()->role !== User::ROLE_SUPER_ADMIN) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $store = Store::findOrFail($id);
        $name = $store->name;

        // DB Cascade deletion handles linked records
        $store->delete();

        ActivityLog::log('delete', "تم حذف المتجر نهائياً: {$name}");

        return response()->json(['message' => 'تم حذف الفرع وكافة بياناته بنجاح']);
    }
}
