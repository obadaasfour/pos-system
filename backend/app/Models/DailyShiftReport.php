<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class DailyShiftReport extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'user_id', 'actual_start', 'actual_end', 'total_sales', 'total_profit', 'orders_count'
    ];

    protected $casts = [
        'actual_start' => 'datetime',
        'actual_end' => 'datetime',
        'total_sales' => 'decimal:2',
        'total_profit' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
