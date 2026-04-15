<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class StoreScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // 1. If we are in a central dashboard context (no store slug in URL)
        // AND the user is a Super Admin, they see everything.
        if (auth()->check() && auth()->user()->role === 'SUPER_ADMIN' && !\App\Models\TenantContext::isSet()) {
            return;
        }

        // 2. If TenantContext is set (resolved from URL slug)
        if (\App\Models\TenantContext::isSet()) {
            $storeId = \App\Models\TenantContext::getStoreId();
            $builder->where($model->getTable() . '.store_id', $storeId);
            return;
        }

        $user = auth()->user();
        $isSuperAdmin = ($user && $user->role === 'SUPER_ADMIN');

        // 2. Fallback to user's assigned store (legacy or non-slug routes)
        if ($user && !$isSuperAdmin) {
            $builder->where($model->getTable() . '.store_id', $user->store_id);
        }
    }
}
