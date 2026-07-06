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
                if (!$user->store_id) {
                    return response()->json([
                        'message' => 'عذراً، هذا الحساب غير مرتبطة بأي متجر أو صلاحية.',
                    ], 403);
                }

                // Check if store is suspended
                if ($user->store?->status === 'suspended') {
                    return response()->json([
                        'message' => 'عذراً، تم إيقاف هذا المتجر مؤقتاً. يرجى التواصل مع الإدارة.',
                        'suspended' => true
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

            // Check if store is suspended
            if (!$isSuperAdmin && $user->store?->status === 'suspended') {
                return response()->json([
                    'message' => 'عذراً، تم إيقاف هذا المتجر مؤقتاً. يرجى التواصل مع الإدارة.',
                    'suspended' => true
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

    public function demoLogin(Request $request)
    {
        $request->validate([
            'type' => 'required|in:restaurant,supermarket,pharmacy',
        ]);

        $type = $request->type;
        $email = "demo-{$type}@cashpos.local";
        $slug = "demo-{$type}";
        $name = "متجر تجريبي - " . ($type === 'restaurant' ? 'مطعم' : ($type === 'supermarket' ? 'سوبر ماركت' : 'صيدلية'));

        // Find or Create Demo Store
        $wasCreated = false;
        $store = \App\Models\Store::where('slug', $slug)->first();
        if (!$store) {
            $store = \App\Models\Store::create([
                'slug' => $slug,
                'name' => $name,
                'address' => 'عنوان تجريبي',
                'phone' => '0900000000',
                'status' => 'active'
            ]);
            $wasCreated = true;
        }

        // Find or Create Demo User
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Demo User',
                'password' => Hash::make('demo1234'),
                'role' => 'admin',
                'store_id' => $store->id
            ]
        );

        if ($wasCreated) {
            $this->seedDemoData($store, $type);
        }

        // Generate Token
        $token = $user->createToken('demo_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user->load('store'),
            'slug'  => $slug,
            'is_demo' => true
        ]);
    }

    private function seedDemoData($store, $type)
    {
        $data = [
            'restaurant' => [
                'categories' => ['وجبات سريعة', 'مشروبات باردة', 'حلويات'],
                'products' => [
                    ['name' => 'تشيز برجر دبل', 'price' => 150000, 'cat' => 'وجبات سريعة'],
                    ['name' => 'بيتزا مارغريتا', 'price' => 120000, 'cat' => 'وجبات سريعة'],
                    ['name' => 'كوكا كولا 330مل', 'price' => 15000, 'cat' => 'مشروبات باردة'],
                    ['name' => 'براونيز بالشوكولاتة', 'price' => 45000, 'cat' => 'حلويات'],
                ]
            ],
            'supermarket' => [
                'categories' => ['مواد غذائية', 'منظفات', 'أجبان وألبان'],
                'products' => [
                    ['name' => 'أرز بسمتي 1كغ', 'price' => 35000, 'cat' => 'مواد غذائية'],
                    ['name' => 'زيت نباتي 1لتر', 'price' => 28000, 'cat' => 'مواد غذائية'],
                    ['name' => 'مسحوق غسيل 2كغ', 'price' => 55000, 'cat' => 'منظفات'],
                    ['name' => 'لبنة بلدية 500غ', 'price' => 22000, 'cat' => 'أجبان وألبان'],
                ]
            ],
            'pharmacy' => [
                'categories' => ['أدوية عامة', 'فيتامينات', 'عناية بالبشرة'],
                'products' => [
                    ['name' => 'بنادول إكسترا', 'price' => 12000, 'cat' => 'أدوية عامة'],
                    ['name' => 'فيتامين C 1000ملغ', 'price' => 25000, 'cat' => 'فيتامينات'],
                    ['name' => 'واقي شمسي 50+', 'price' => 85000, 'cat' => 'عناية بالبشرة'],
                    ['name' => 'أموكسيسيلين 500ملغ', 'price' => 18000, 'cat' => 'أدوية عامة'],
                ]
            ]
        ];

        $currentData = $data[$type] ?? $data['supermarket'];

        foreach ($currentData['categories'] as $catName) {
            $cat = \App\Models\Category::create([
                'store_id' => $store->id,
                'name' => $catName
            ]);

            $prods = array_filter($currentData['products'], fn($p) => $p['cat'] === $catName);
            foreach ($prods as $p) {
                \App\Models\Product::create([
                    'store_id' => $store->id,
                    'category_id' => $cat->id,
                    'name' => $p['name'],
                    'price_syr' => $p['price'],
                    'stock_quantity' => 100,
                    'barcode' => 'DEMO-' . rand(1000, 9999)
                ]);
            }
        }
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->tokens()->delete();

        ActivityLog::log('logout', "تسجيل خروج المستخدم: {$user->name}");

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح.']);
    }
}
