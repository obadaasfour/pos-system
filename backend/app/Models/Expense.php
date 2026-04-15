<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class Expense extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'category', 'amount', 'date', 'notes', 'employee_id'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
