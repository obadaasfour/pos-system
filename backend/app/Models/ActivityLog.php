<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToStore;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ActivityLog extends Model
{
    use HasFactory, BelongsToStore;

    protected $fillable = [
        'store_id', 'user_id', 'user_name', 'action_type', 'description',
        'old_values', 'new_values', 'ip_address'
    ];

    protected $casts = [
        'old_values' => 'json',
        'new_values' => 'json',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper to log activity quickly with multi-tenant context.
     */
    public static function log($actionType, $description, $old = null, $new = null)
    {
        $user = auth()->user();
        return self::create([
            'store_id'    => $user?->store_id ?? 1,
            'user_id'     => $user?->id,
            'user_name'   => $user?->name ?? 'System',
            'action_type' => $actionType,
            'description' => $description,
            'old_values'  => $old,
            'new_values'  => $new,
            'ip_address'  => request()->ip(),
        ]);
    }
}
