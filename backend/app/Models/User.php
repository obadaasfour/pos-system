<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\BelongsToStore;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, BelongsToStore;
    
    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::addGlobalScope('privacy_shield', function ($builder) {
            // If the user is authenticated and is NOT a SUPER_ADMIN, hide all SUPER_ADMINs
            if (auth()->check() && auth()->user()->role !== self::ROLE_SUPER_ADMIN) {
                $builder->where('role', '!=', self::ROLE_SUPER_ADMIN);
            }
        });
    }

    public const ROLE_ADMIN = 'admin';
    public const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';
    public const ROLE_SUPPLIER = 'SUPPLIER';

    protected $fillable = [
        'store_id', 'name', 'email', 'password', 'role',
        'shift_start', 'shift_end', 'last_login_at', 'last_logout_at'
    ];

    public function supplier()
    {
        return $this->hasOne(Supplier::class);
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_SUPER_ADMIN]);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function dailyReports()
    {
        return $this->hasMany(DailyShiftReport::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }
}
