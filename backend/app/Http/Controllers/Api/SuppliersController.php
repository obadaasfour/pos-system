<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SuppliersController extends Controller
{
    public function index(Request $request)
    {
        // If Super Admin, bypass any store filtering (Global Suppliers)
        $query = Supplier::latest();
        
        if ($request->user() && $request->user()->role === \App\Models\User::ROLE_SUPER_ADMIN) {
            // Suppliers might be global or tenant-based, for Super Admin we show all.
            // If we have a global scope on Supplier, we would use withoutGlobalScopes() here.
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'nullable|string',
            'email'        => 'required|email',
            'address'      => 'nullable|string',
            'enableLogin'  => 'boolean',
            'password'     => 'required_if:enableLogin,true|nullable|string|min:8',
        ]);

        $userId = null;

        // Check if a global supplier account already exists for this email
        // We use withoutGlobalScopes because the user might have store_id = null (global)
        $existingUser = \App\Models\User::withoutGlobalScopes()->where('email', $request->email)->first();

        if ($existingUser) {
            // If user exists, they MUST be a SUPPLIER to link automatically
            if ($existingUser->role === 'SUPPLIER') {
                $userId = $existingUser->id;
            } else if ($request->enableLogin) {
                // If they tried to enable login for a non-supplier email, throw error
                return response()->json([
                    'message' => 'عذراً، هذا البريد الإلكتروني مستخدم لحساب غير حساب مورد. يرجى استخدام بريد مختلف.',
                ], 422);
            }
        } else if ($request->enableLogin) {
            // Create new global supplier user if requested and doesn't exist
            $newUser = \App\Models\User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => \Illuminate\Support\Facades\Hash::make($request->password),
                'role'     => 'SUPPLIER',
                'store_id' => null, // Global access role
            ]);
            $userId = $newUser->id;
        }

        $supplier = Supplier::create([
            'name'    => $request->name,
            'phone'   => $request->phone,
            'email'   => $request->email,
            'address' => $request->address,
            'user_id' => $userId,
        ]);

        return response()->json([
            'message'  => 'تم إضافة المورد بنجاح.',
            'supplier' => $supplier,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'nullable|string',
            'email'   => 'nullable|email',
            'address' => 'nullable|string',
        ]);

        $supplier->update($request->only(['name', 'phone', 'email', 'address']));

        return response()->json([
            'message'  => 'تم تحديث بيانات المورد.',
            'supplier' => $supplier,
        ]);
    }

    public function destroy($id)
    {
        Supplier::findOrFail($id)->delete();
        return response()->json(['message' => 'تم حذف المورد.']);
    }
}
