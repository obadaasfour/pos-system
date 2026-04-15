<?php

namespace App\Traits;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;

trait HasSuperAdminAccess
{
    /**
     * Ensure the authenticated user is a Super Admin.
     */
    protected function authorizeSuperAdmin()
    {
        if (!auth()->check() || auth()->user()->role !== User::ROLE_SUPER_ADMIN) {
            throw new HttpResponseException(response()->json([
                'message' => 'Unauthorized. This action requires Super Admin privileges.'
            ], 403));
        }
    }

    /**
     * Check if the user is a Super Admin.
     */
    protected function isSuperAdmin()
    {
        return auth()->check() && auth()->user()->role === User::ROLE_SUPER_ADMIN;
    }
}
