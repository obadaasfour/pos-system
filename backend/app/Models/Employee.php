<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class Employee extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'name', 'phone', 'email', 'position', 'base_salary'
    ];

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
