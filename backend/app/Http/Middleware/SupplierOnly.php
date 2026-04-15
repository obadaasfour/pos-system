<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SupplierOnly
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json([
                'message' => 'عذراً، هذا القسم مخصص لشركائنا الموردين فقط.',
                'unauthorized_role' => true
            ], 403);
        }

        return $next($request);
    }
}
