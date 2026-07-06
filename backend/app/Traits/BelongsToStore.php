<?php

namespace App\Traits;

use App\Scopes\StoreScope;
use Illuminate\Database\Eloquent\Model;

trait BelongsToStore
{
    /**
     * Boot the trait and register the global scope and event hooks.
     */
    protected static function bootBelongsToStore()
    {
        // 1. Filter all queries by current store_id
        static::addGlobalScope(new StoreScope);

        static::creating(function (Model $model) {
            // If store_id is already set (e.g. creating store admin), respect it
            if ($model->getAttribute('store_id')) {
                return;
            }

            if (auth()->check()) {
                $user = auth()->user();

                // If user is Super Admin, we ONLY use the TenantContext (slug-based)
                // We do NOT fallback to user->store_id because Super Admins can perform global actions.
                if ($user->role === 'SUPER_ADMIN') {
                    $storeId = \App\Models\TenantContext::getStoreId();
                } else {
                    $storeId = $user->store_id;
                }

                if (!$storeId && $user->role !== 'SUPER_ADMIN') {
                    throw new \Exception('Store context is required for creation');
                }

                if ($storeId) {
                    $model->setAttribute('store_id', $storeId);
                }
            }
        });
    }

    /**
     * Get the store that the model belongs to.
     */
    public function store()
    {
        return $this->belongsTo(\App\Models\Store::class);
    }
}
