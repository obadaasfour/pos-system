<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class QueryTokenAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If the 'token' is present in the query string and no Authorization header exists
        if ($request->has('token') && !$request->hasHeader('Authorization')) {
            $token = $request->query('token');
            // Prepend 'Bearer ' if it's missing
            if (!str_starts_with($token, 'Bearer ')) {
                $token = 'Bearer ' . $token;
            }
            // Inject the header so Sanctum can find it
            $request->headers->set('Authorization', $token);
        }

        return $next($request);
    }
}
