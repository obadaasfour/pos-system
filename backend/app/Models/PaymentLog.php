<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class PaymentLog extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'transaction_id', 'customer_id', 'amount', 'payment_method', 'notes', 'date'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
