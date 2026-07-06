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
     * Permanently delete a store and all associated data.
     */
    public function hardDeleteStore(Store $store)
    {
        $name = $store->name;
        
        return DB::transaction(function () use ($store, $name) {
            // DB Cascade deletion should handle related records if foreign keys are set correctly.
            // If not, we could manually delete them here.
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
