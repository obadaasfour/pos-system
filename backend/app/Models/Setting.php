<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Traits\BelongsToStore;

class Setting extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = ['store_id', 'key', 'value'];

    /**
     * Get a setting value by key.
     * Tries current store first, then falls back to store_id = 1 (global default).
     */
    public static function get($key, $default = null)
    {
        // 1. Determine current store context
        $storeId = TenantContext::getStoreId() ?: (auth()->check() ? auth()->user()->store_id : null);

        // 2. Query for the setting
        $setting = self::where('key', $key)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when(!$storeId, fn($q) => $q->where('store_id', 1))
            ->first();

        // 3. Fallback: try global/default store (store_id = 1)
        if (!$setting && $storeId && $storeId !== 1) {
            $setting = self::withoutGlobalScopes()
                ->where('key', $key)
                ->where('store_id', 1)
                ->first();
        }

        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value by key for the current store.
     */
    public static function set($key, $value)
    {
        $storeId = TenantContext::getStoreId() ?: (auth()->check() ? auth()->user()->store_id : 1);

        return self::updateOrCreate(
            ['key' => $key, 'store_id' => $storeId],
            ['value' => $value]
        );
    }

    /**
     * Cash balance helpers
     */
    public static function getCashBalance()
    {
        return (float) self::get('cash_balance', 0);
    }

    public static function updateCashBalance($amount)
    {
        $current = self::getCashBalance();
        return self::set('cash_balance', $current + $amount);
    }

    public static function incrementCashBalance($amount)
    {
        return self::updateCashBalance($amount);
    }

    public static function decrementCashBalance($amount)
    {
        return self::updateCashBalance(-$amount);
    }
}
