<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Models\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 0. Skip for Super Admin global routes, global re-hydration, supplier portal, and announcements
        if ($request->is('api/super-admin*') || $request->is('super-admin*') || $request->is('api/user*') || $request->is('api/supplier*') || $request->is('api/*/announcements*')) {
            return $next($request);
        }

        // 1. Extract slug from route parameters
        $slug = $request->route('slug');

        \Log::info('Slug Trace: ' . ($slug ?? 'N/A') . ' | User Store: ' . (auth()->user()?->store_id ?? 'GUEST'));

        if (!$slug) {
            return $next($request);
        }

        // 2. Find the store
        $store = Store::where('slug', $slug)->first();

        if (!$store) {
            return response()->json([
                'message' => 'المحل غير موجود أو الرابط غير صحيح (Invalid Store Slug)',
                'slug_error' => true
            ], 404);
        }

        // 3. Set global context
        TenantContext::setStoreId($store->id);

        // 4. Verification logic (for authenticated requests)
        $user = auth()->user();
        if ($user) {
            $isSuperAdmin = ($user->role === 'SUPER_ADMIN');
            $isSupplier   = ($user->role === 'SUPPLIER');
            
            // Check if user belongs to this store OR is a Super Admin OR is a Global Supplier
            if (!$isSuperAdmin && !$isSupplier && $user->store_id !== $store->id) {
                return response()->json([
                    'message' => 'عذراً، ليس لديك صلاحية الوصول لبيانات هذا المحل.',
                    'unauthorized_store' => true
                ], 403);
            }

            // Log Super Admin entry if applicable
            if ($isSuperAdmin && $user->store_id !== $store->id) {
                \App\Models\ActivityLog::log(
                    'SUPER_ADMIN_ENTRY', 
                    "دخول Super Admin لمحل: {$store->name} عبر الرابط /{$slug}"
                );
            }
        }

        return $next($request);
    }
}
