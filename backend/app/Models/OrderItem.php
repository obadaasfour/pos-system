<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\BelongsToStore;

class OrderItem extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'order_id', 'product_id', 'batch_id', 'quantity', 'unit_price', 'unit_cost_price', 'subtotal'];

    public function batch()
    {
        return $this->belongsTo(ProductBatch::class, 'batch_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
