<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id', 'product_id', 'suggestion_id', 'supplier_id', 'quantity', 'status', 
        'price_at_order_usd', 'price_at_order_syr', 
        'shipped_at', 'received_at', 'tracking_number'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function suggestion()
    {
        return $this->belongsTo(ProductSuggestion::class, 'suggestion_id');
    }
}
