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

                $storeId = ($user->role === 'SUPER_ADMIN') 
                    ? \App\Models\TenantContext::getStoreId()
                    : $user->store_id;

                if (!$storeId) {
                    throw new \Exception('Store context is required for creation');
                }

                $model->setAttribute('store_id', $storeId);
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
