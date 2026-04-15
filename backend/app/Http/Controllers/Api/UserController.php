<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Create a new user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,cashier,SUPPLIER',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'store_id' => auth()->user()->store_id ?? 1,
        ]);

        return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
    }

    /**
     * List all users (including soft-deleted for status display).
     */
    public function index(Request $request)
    {
        $query = User::withTrashed()->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->paginate(10);
    }

    /**
     * Update a user's role and/or password.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'role'        => 'sometimes|in:admin,cashier',
            'password'    => 'sometimes|string|min:8',
            'shift_start' => 'nullable|string',
        ]);

        $user = User::withTrashed()->findOrFail($id);

        // Privacy Shield Guard: Only Super Admin can edit another Super Admin
        if ($user->role === User::ROLE_SUPER_ADMIN && auth()->user()->role !== User::ROLE_SUPER_ADMIN) {
            return response()->json(['message' => 'Unauthorized access to super administrator account.'], 403);
        }

        if ($request->filled('role')) {
            $user->role = $request->role;
        }

        if ($request->filled('password')) {
            // Supplier Security Lock: 
            // If user is a SUPPLIER and is linked to >1 store (Multiple Supplier records),
            // ONLY Super Admin can change their password.
            if ($user->role === 'SUPPLIER' && auth()->user()->role !== \App\Models\User::ROLE_SUPER_ADMIN) {
                $linkedStoresCount = \App\Models\Supplier::withoutGlobalScopes()
                    ->where('user_id', $user->id)
                    ->count();
                
                if ($linkedStoresCount > 1) {
                    return response()->json([
                        'message' => 'عذراً، هذا المورد مرتبطة بمتاجر أخرى. فقط مدير النظام الأساسي (Super Admin) يمكنه تغيير كلمة مروره حفاظاً على استقرار حسابه.'
                    ], 403);
                }
            }
            $user->password = Hash::make($request->password);
        }

        if ($request->has('shift_start')) {
            $user->shift_start = $request->shift_start;
        }

        if ($request->has('shift_end')) {
            $user->shift_end = $request->shift_end;
        }

        $user->save();

        ActivityLog::log('update_user', "تعديل بيانات المستخدم: {$user->name}");

        return response()->json(['status' => true, 'user' => $user]);
    }

    /**
     * Soft-delete a user with safety guards.
     */
    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();
        $targetUser  = User::findOrFail($id);

        // Guard 1: Cannot delete yourself
        if ($currentUser->id === $targetUser->id) {
            return response()->json([
                'status'  => false,
                'message' => 'لا يمكنك حذف حسابك الخاص.',
            ], 403);
        }

        // Privacy Shield Guard: Only Super Admin can delete another Super Admin
        if ($targetUser->role === User::ROLE_SUPER_ADMIN && $currentUser->role !== User::ROLE_SUPER_ADMIN) {
            return response()->json(['message' => 'Unauthorized access to super administrator account.'], 403);
        }

        // Guard 2: Cannot delete the last admin
        if ($targetUser->role === 'admin') {
            $adminCount = User::where('role', 'admin')->count();
            if ($adminCount <= 1) {
                return response()->json([
                    'status'  => false,
                    'message' => 'لا يمكن حذف آخر مستخدم برتبة مدير في النظام.',
                ], 403);
            }
        }

        $targetUser->delete(); // Soft delete

        ActivityLog::log('delete_user', "حذف المستخدم: {$targetUser->name}");

        return response()->json(['status' => true, 'message' => 'تم حذف المستخدم بنجاح.']);
    }

    /**
     * Restore a soft-deleted user.
     */
    public function restore($id)
    {
        $user = User::withTrashed()->findOrFail($id);

        // Privacy Shield Guard: Only Super Admin can restore another Super Admin
        if ($user->role === User::ROLE_SUPER_ADMIN && auth()->user()->role !== User::ROLE_SUPER_ADMIN) {
            return response()->json(['message' => 'Unauthorized access to super administrator account.'], 403);
        }

        $user->restore();

        ActivityLog::log('restore_user', "استعادة المستخدم: {$user->name}");

        return response()->json(['status' => true, 'user' => $user]);
    }
}
