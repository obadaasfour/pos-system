<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class Purchase extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'supplier_id', 'user_id', 'total_amount', 'notes', 'exchange_rate', 'invoice_number', 'status', 'supplied_quantity', 'unit_price'
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class);
    }
}
