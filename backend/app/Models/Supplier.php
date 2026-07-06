<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'contact_person', 'email', 'phone', 'address'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function shortageRequests()
    {
        return $this->hasMany(ShortageRequest::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }
}
