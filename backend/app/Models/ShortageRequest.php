<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShortageRequest extends Model
{
    protected $fillable = [
        'store_id', 'product_id', 'supplier_id', 'current_stock', 'min_quantity', 'status'
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
