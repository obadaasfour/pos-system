<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'       => 'required|email',
            'password'    => 'required',
            'device_name' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        // 1. Basic validation
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['البيانات المدخلة غير صحيحة.'],
            ]);
        }

        $isGlobalLogin = !\App\Models\TenantContext::isSet();
        $isSuperAdmin  = $user->role === 'SUPER_ADMIN';
        $isSupplier    = $user->role === 'SUPPLIER';

        // 2. Global Login Logic
        if ($isGlobalLogin) {
            // Suppliers and Super Admins are allowed to login globally
            if (!$isSuperAdmin && !$isSupplier) {
                // If it's a standard user (admin/cashier) trying to login globally,
                // we permit it but they MUST have a store_id so we can redirect them.
                if (!$user->store_id) {
                    return response()->json([
                        'message' => 'عذراً، هذا الحساب غير مرتبطة بأي متجر أو صلاحية.',
                    ], 403);
                }
            }
            ActivityLog::log('login', "تسجيل دخول ({$user->role}): {$user->name}");
        } else {
            // 3. Slug-based Login Logic
            $storeId = \App\Models\TenantContext::getStoreId();
            
            if (!$isSuperAdmin && $user->store_id !== $storeId) {
                return response()->json([
                    'message' => 'هذا الحساب غير تابع لهذا المتجر.',
                    'unauthorized_store' => true
                ], 403);
            }

            ActivityLog::log('login', "تسجيل دخول المستخدم: {$user->name} عبر الرابط /" . $request->route('slug'));
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user->load(['store', 'supplier']),
            'slug'  => $request->route('slug') ?? $user->store?->slug
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'required|in:admin,cashier',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => $request->role,
        ]);

        $token = $user->createToken('register_token')->plainTextToken;

        return response()->json([
            'status'  => true,
            'user'    => $user,
            'token'   => $token,
            'message' => 'تم إنشاء الحساب بنجاح.',
        ], 201);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->tokens()->delete();

        ActivityLog::log('logout', "تسجيل خروج المستخدم: {$user->name}");

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح.']);
    }
}
