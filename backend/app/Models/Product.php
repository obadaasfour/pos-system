<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, BelongsToStore, SoftDeletes;

    protected $fillable = [
        'store_id', 'category_id', 'supplier_id', 'uuid', 'name', 'barcode', 'description', 
        'stock_quantity', 'min_quantity', 'image_path', 'cost_price', 'price_usd', 'price_syr', 'planned_price_usd', 'sale_price_usd'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    protected $appends = ['current_cost', 'current_cost_usd', 'price_usd', 'price', 'image_url', 'purchase_exchange_rate', 'planned_price_usd', 'sale_price_usd'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class)->where('remaining_qty', '>', 0);
    }

    /**
     * Get the current cost price from the oldest active batch.
     */
    public function getCurrentCostAttribute()
    {
        $batch = $this->batches()->orderBy('id', 'asc')->first();
        return $batch ? (float) $batch->cost_local : 0;
    }

    public function getCurrentCostUsdAttribute()
    {
        $batch = $this->batches()->orderBy('id', 'asc')->first();
        return $batch ? (float) $batch->cost_usd : 0;
    }

    public function getPriceUsdAttribute()
    {
        $batch = $this->batches()->orderBy('id', 'asc')->first();

        if (!$batch) {
            // Fallback to product defaults
            return (float) ($this->attributes['sale_price_usd'] ?? $this->attributes['planned_price_usd'] ?? $this->attributes['price_usd'] ?? 0);
        }

        return (float) ($batch->sale_price_usd ?? $batch->planned_price_usd ?? 0);
    }

    /**
     * Get the current sale price from the oldest active batch.
     */
    public function getPriceAttribute()
    {
        $rate = (float) Setting::get('exchange_rate', 1);
        if ($rate <= 0) $rate = 1;

        return round($this->price_usd * $rate, 0);
    }

    /**
     * Get the full URL for the product image.
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image_path) return null;
        return asset(Storage::url($this->image_path));
    }

    /**
     * Get the exchange rate used when purchasing the current stock.
     */
    public function getPurchaseExchangeRateAttribute()
    {
        $batch = $this->batches()->orderBy('id', 'asc')->first();
        return $batch ? (float) $batch->exchange_rate : null;
    }

    public function getPlannedPriceUsdAttribute()
    {
        $batch = $this->batches()->orderBy('id', 'asc')->first();
        if ($batch && $batch->planned_price_usd > 0) {
            return (float) $batch->planned_price_usd;
        }
        return (float) ($this->attributes['planned_price_usd'] ?? 0);
    }

    public function getSalePriceUsdAttribute()
    {
        return $this->price_usd;
    }
}
