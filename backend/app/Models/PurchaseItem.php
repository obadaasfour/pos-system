<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class PurchaseItem extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'purchase_id', 'product_id', 'batch_id', 'quantity', 'unit_cost_price', 'subtotal', 'temp_product_name', 'temp_barcode', 'temp_image_path'];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
