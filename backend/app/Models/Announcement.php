<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = [
        'store_id', 'title', 'content', 'type', 'is_active'
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
