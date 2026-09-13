<?php

namespace App\Services;

use App\Models\Store;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class StoreManagementService
{
    /**
     * Suspend a store and its users.
     */
    public function suspendStore(Store $store)
    {
        $oldData = $store->toArray();
        $store->status = 'suspended';
        $store->is_active = false;
        $store->save();

        ActivityLog::log('edit', "تم إيقاف المتجر: {$store->name}", $oldData, $store->toArray());

        return $store;
    }

    /**
     * Activate a store.
     */
    public function activateStore(Store $store)
    {
        $oldData = $store->toArray();
        $store->status = 'active';
        $store->is_active = true;
        $store->save();

        ActivityLog::log('edit', "تم تفعيل المتجر: {$store->name}", $oldData, $store->toArray());

        return $store;
    }

    /**
     * Permanently delete a store and all associated data safely.
     */
    public function hardDeleteStore(Store $store)
    {
        $name = $store->name;
        $storeId = $store->id;
        
        return DB::transaction(function () use ($store, $name, $storeId) {
            // 1. Unlink any SUPER_ADMIN users currently assigned to this store so they don't get deleted
            User::where('role', User::ROLE_SUPER_ADMIN)
                ->where('store_id', $storeId)
                ->update(['store_id' => null]);

            // 2. Cleanly delete all child records in correct dependency order
            if (DB::getSchemaBuilder()->hasTable('product_suggestion_targets')) {
                DB::table('product_suggestion_targets')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('shortage_requests')) {
                DB::table('shortage_requests')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('supplier_orders')) {
                DB::table('supplier_orders')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('pending_orders')) {
                DB::table('pending_orders')->where('store_id', $storeId)->delete();
            }

            // Sales & Invoices
            if (DB::getSchemaBuilder()->hasTable('order_items')) {
                DB::table('order_items')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('orders')) {
                DB::table('orders')->where('store_id', $storeId)->delete();
            }

            // Procurement & Batches
            if (DB::getSchemaBuilder()->hasTable('purchase_items')) {
                DB::table('purchase_items')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('product_batches')) {
                DB::table('product_batches')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('purchases')) {
                DB::table('purchases')->where('store_id', $storeId)->delete();
            }

            // Inventory & Catalog
            if (DB::getSchemaBuilder()->hasTable('products')) {
                DB::table('products')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('categories')) {
                DB::table('categories')->where('store_id', $storeId)->delete();
            }

            // Operations & Finance
            if (DB::getSchemaBuilder()->hasTable('payment_logs')) {
                DB::table('payment_logs')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('daily_shift_reports')) {
                DB::table('daily_shift_reports')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('expenses')) {
                DB::table('expenses')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('employees')) {
                DB::table('employees')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('customers')) {
                DB::table('customers')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('settings')) {
                DB::table('settings')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('activity_logs')) {
                DB::table('activity_logs')->where('store_id', $storeId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('suppliers')) {
                DB::table('suppliers')->where('store_id', $storeId)->delete();
            }

            // Delete store users (except SUPER_ADMIN)
            User::where('role', '!=', User::ROLE_SUPER_ADMIN)
                ->where('store_id', $storeId)
                ->forceDelete();

            // 3. Delete store record
            $store->delete();
            
            ActivityLog::log('delete', "تم حذف المتجر نهائياً مع كافة بياناته: {$name}");
            
            return true;
        });
    }

    /**
     * Create a new store with its primary admin account.
     */
    public function createStore(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Create the store
            $store = Store::create([
                'name' => $data['name'],
                'slug' => $data['slug'],
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'status' => 'active',
                'is_active' => true,
            ]);

            // 2. Create the store's primary admin
            $admin = User::create([
                'store_id' => $store->id,
                'name' => 'مدير المحل: ' . $store->name,
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'role' => User::ROLE_ADMIN,
            ]);

            // 3. Log the activity (Global context)
            ActivityLog::log('add', "تم إنشاء محل جديد: {$store->name}", null, $store->toArray());

            return [
                'store' => $store,
                'admin' => $admin
            ];
        });
    }
}
