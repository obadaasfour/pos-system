<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductSuggestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id', 'name', 'description', 'image_path', 
        'category_id', 'price_usd', 'status', 'target_all'
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->image_path ? \Illuminate\Support\Facades\Storage::url($this->image_path) : null;
    }

    protected $casts = [
        'price_usd'  => 'float',
        'target_all' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class)->withoutGlobalScopes();
    }

    public function category()
    {
        return $this->belongsTo(Category::class)->withoutGlobalScopes();
    }

    public function targetStores()
    {
        return $this->belongsToMany(Store::class, 'product_suggestion_targets');
    }
}
