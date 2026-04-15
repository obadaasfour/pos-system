<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShortageRequest;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SupplierPortalController extends Controller
{
    /**
     * Get all pending shortages for the authenticated supplier.
     */
    public function getShortages(Request $request)
    {
        $user = $request->user();
        
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Aggregate all IDs from all stores linked to this user
        $supplierIds = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->pluck('id');

        $shortages = ShortageRequest::with([
            'store' => function($q) { $q->withoutGlobalScopes(); },
            'product' => function($q) { $q->withoutGlobalScopes(); }
        ])
            ->whereIn('supplier_id', $supplierIds)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($shortages);
    }

    /**
     * Get products assigned to this supplier across all stores.
     */
    public function getProducts(Request $request)
    {
        $user = $request->user();

        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplierIds = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->pluck('id');

        $products = Product::withoutGlobalScopes()
            ->whereIn('supplier_id', $supplierIds)
            ->with([
                'category' => function($q) { $q->withoutGlobalScopes(); },
                'store' => function($q) { $q->withoutGlobalScopes(); },
                'supplier' => function($q) { $q->withoutGlobalScopes(); }
            ])
            ->get();

        return response()->json($products);
    }

    /**
     * Mark a shortage request as processing.
     */
    public function markAsProcessing(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplierIds = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->pluck('id');

        $shortage = ShortageRequest::where('id', $id)
            ->whereIn('supplier_id', $supplierIds)
            ->firstOrFail();

        $shortage->update(['status' => 'processing']);

        return response()->json(['message' => 'تم تغيير الحالة إلى جاري التجهيز.']);
    }

    /**
     * Mark a shortage request as supplied and generate an invoice.
     */
    public function markAsSupplied(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplierIds = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->pluck('id');

        $shortage = ShortageRequest::with(['product', 'store'])->where('id', $id)
            ->whereIn('supplier_id', $supplierIds)
            ->firstOrFail();

        $price = $request->input('unit_price');
        $qty   = $request->input('supplied_quantity');

        // Validation (redundant but safe)
        if (!$qty || $qty <= 0) {
            return response()->json(['message' => 'الكمية غير صالحة.'], 422);
        }

        // fallback to product cost if not provided
        if (!$price) {
            $price = $shortage->product->cost_price ?? 0;
        }

        $price = floatval($price);
        $qty   = intval($qty);
        $total = $price * $qty;

        \DB::transaction(function() use ($shortage, $user, $price, $qty, $total) {
            // 1. Create Purchase record (pending_confirmation)
            $purchase = \App\Models\Purchase::create([
                'store_id'          => $shortage->store_id,
                'supplier_id'       => $shortage->supplier_id,
                'user_id'           => $user->id,
                'exchange_rate'     => 1.0, 
                'total_amount'      => $total,
                'supplied_quantity' => $qty,
                'unit_price'        => $price,
                'status'            => 'pending_confirmation',
                'notes'             => "توليد تلقائي عبر بوابة المورد - طلب رقم #{$shortage->id}",
                'invoice_number'    => 'SUP-' . date('Y') . '-' . str_pad($shortage->id, 4, '0', STR_PAD_LEFT)
            ]);

            // 2. Add Item with fixed Metadata
            $purchase->items()->create([
                'store_id'          => $shortage->store_id,
                'product_id'        => $shortage->product_id,
                'temp_product_name' => $shortage->product->name ?? 'منتج غير معروف',
                'temp_barcode'      => $shortage->product->barcode ?? null,
                'temp_image_path'   => $shortage->product->image_path ?? null,
                'quantity'          => $qty,
                'unit_cost_price'   => $price,
                'subtotal'          => $total
            ]);

            // 3. Mark shortage as supplied
            $shortage->update(['status' => 'supplied']);

            // 4. Notify the Store via Reverb (Real-time)
            broadcast(new \App\Events\InventoryUpdated($shortage->store_id));
        });

        return response()->json(['message' => 'تم توريد المنتج بنجاح وإنشاء فاتورة مسودة بانتظار تأكيد المتجر.']);
    }

    /**
     * Get recent purchase invoices created by the supplier.
     */
    public function getPurchases(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $purchases = \App\Models\Purchase::withoutGlobalScopes()
            ->with([
                'items' => function($q) { $q->withoutGlobalScopes()->with(['product' => function($pq) { $pq->withoutGlobalScopes(); }]); },
                'store' => function($q) { $q->withoutGlobalScopes(); },
                'supplier' => function($q) { $q->withoutGlobalScopes(); }
            ])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json($purchases);
    }

    /**
     * Store a new product uploaded by the supplier.
     */
    public function storeProduct(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'barcode'        => 'nullable|string|unique:products,barcode',
            'price_usd'      => 'nullable|numeric|min:0',
            'price_syr'      => 'nullable|numeric|min:0',
            'category_id'    => 'nullable|exists:categories,id',
            'description'    => 'nullable|string',
            'image'          => 'nullable|image|max:2048',
        ]);

        // Get this user's primary supplier ID
        $supplier = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $data = $validated;
        unset($data['image']); // Don't save raw file to DB

        // 1. Handle Fallbacks
        if (empty($data['category_id'])) {
            $category = Category::firstOrCreate(['name' => 'General']);
            $data['category_id'] = $category->id;
            Log::info("Supplier [{$supplier->id}] used category fallback for product: {$data['name']}");
        }

        if (empty($data['barcode'])) {
            $data['barcode'] = 'INT-' . time() . '-' . random_int(1000, 9999);
        }

        $data['supplier_id']    = $supplier->id;
        $data['store_id']       = 1; 
        $data['stock_quantity'] = $request->input('stock_quantity', 0);
        $data['min_quantity']   = $request->input('min_quantity', 0);
        $data['price']          = $data['price_syr'] ?? 0;
        $data['cost_price']     = $data['price_syr'] ?? 0;

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        return DB::transaction(function() use ($data, $supplier, $request) {
            $product = Product::create($data);
            $product->refresh(); // Load all attributes and accessors properly

            // 1. Persist Announcement
            \App\Models\Announcement::create([
                'store_id'  => null,
                'title'     => 'منتج جديد متوفر',
                'content'   => "أضاف المورد {$supplier->name} منتجاً جديداً: {$product->name}. سعر $: " . ($data['price_usd'] ?? 0) . " | رابط الصورة: {$product->image_url}",
                'type'      => 'new_product',
                'is_active' => true,
            ]);

            // 2. Broadcast Global Event
            try {
                \Log::info("Broadcasting GlobalNewProductEvent for Product [{$product->id}] by Supplier [{$supplier->id}]");
                broadcast(new \App\Events\GlobalNewProductEvent(
                    $supplier->id,
                    $supplier->name,
                    $supplier->phone,
                    $product->name,
                    $data['price_usd'] ?? 0,
                    $data['price_syr'] ?? 0,
                    $product->id,
                    $product->image_path
                ))->toOthers();
                \Log::info("Broadcast successful for Product [{$product->id}]");
            } catch (\Exception $e) {
                \Log::error("Broadcasting failed for Product [{$product->id}] by Supplier [{$supplier->id}]. Error: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'تم إضافة المنتج بنجاح وإرسال الإشعار لجميع المتاجر.',
                'product' => $product->load('category')
            ], 201);
        });
    }

    /**
     * Update an existing product owned by the supplier.
     */
    public function updateProduct(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplier = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $product = Product::withoutGlobalScopes()
            ->where('id', $id)
            ->where('supplier_id', $supplier->id)
            ->firstOrFail();

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'price_usd'   => 'nullable|numeric|min:0',
            'price_syr'   => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $data = $validated;
        $data['price'] = $validated['price_syr'] ?? $product->price;

        $product->update($data);

        return response()->json(['message' => 'تم تحديث بيانات المنتج بنجاح.', 'product' => $product]);
    }

    /**
     * Delete a product owned by the supplier.
     */
    public function deleteProduct(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplier = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $product = Product::withoutGlobalScopes()
            ->where('id', $id)
            ->where('supplier_id', $supplier->id)
            ->firstOrFail();

        // We use SoftDeletes, so we keep the database record and the image
        $product->delete();

        return response()->json(['message' => 'تم نقل المنتج للأرشيف بنجاح.']);
    }
}
