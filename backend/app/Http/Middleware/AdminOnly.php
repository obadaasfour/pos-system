<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminOnly
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user() || ! $request->user()->isAdmin()) {
            return response()->json([
                'message' => 'غير مصرح لك بالوصول. هذه الصفحة للمدير فقط.',
            ], 403);
        }

        return $next($request);
    }
}
