<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request, $slug)
    {
        $query = Product::with('category')->latest();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        return $query->paginate(10);
    }

    public function store(Request $request, $slug)
    {
        // ── UUID Idempotency Check ──
        if ($request->has('uuid')) {
            $existingProduct = Product::where('uuid', $request->uuid)->first();
            if ($existingProduct) {
                return response()->json([
                    'message' => 'تمت معالجة هذا المنتج مسبقاً (Idempotent)',
                    'product' => $existingProduct->load('category'),
                    'synced'  => true
                ], 200);
            }
        }

        $validated = $request->validate([
            'uuid'           => 'required|string|max:50',
            'name'           => 'required|string|max:255',
            'barcode'        => 'nullable|string|max:255',
            'price'          => 'nullable|numeric|min:0',
            'cost_price'     => 'nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'category_id'    => 'nullable', // Resolve numeric or UUID
            'description'    => 'nullable|string',
            'min_quantity'   => 'nullable|integer|min:0',
            'supplier_id'    => 'nullable|exists:suppliers,id',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $data = $validated;
        
        // Resolve Category ID
        if (isset($data['category_id']) && !empty($data['category_id'])) {
            if (!is_numeric($data['category_id'])) {
                $category = Category::where('uuid', $data['category_id'])->first();
                $data['category_id'] = $category ? $category->id : null;
            }
        }

        if (!isset($data['category_id']) || empty($data['category_id'])) {
            $category = Category::firstOrCreate(['name' => 'عام']);
            $data['category_id'] = $category->id;
        }

        $data['cost_price']     = $data['cost_price'] ?? 0;
        $data['stock_quantity'] = $data['stock_quantity'] ?? 0;

        if (isset($data['barcode']) && trim($data['barcode']) === '') {
            $data['barcode'] = null;
        }

        // Handle Image Upload
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = $path;
        }

        return \DB::transaction(function() use ($data, $request) {
            $product = Product::create($data);

            if ($product->stock_quantity > 0) {
                \App\Models\ProductBatch::create([
                    'product_id'        => $product->id,
                    'original_quantity' => $product->stock_quantity,
                    'remaining_qty'     => $product->stock_quantity,
                    'cost_local'        => $product->cost_price ?? 0,
                    'exchange_rate'     => 1,
                ]);
            }

            // Persistence & Real-time Broadcasting after successful save
            try {
                $supplier = $product->supplier_id ? \App\Models\Supplier::find($product->supplier_id) : null;
                $supplierName = $supplier ? $supplier->name : ($request->user()->name ?? 'مورد عام');

                // 1. Record in DB for historical view
                \App\Models\Announcement::create([
                    'store_id'  => null, // Global
                    'title'     => 'منتج جديد من المورد',
                    'content'   => "قام {$supplierName} بإضافة منتج جديد: {$product->name} بسعر {$product->price} ل.س",
                    'type'      => 'new_product',
                    'is_active' => true,
                ]);

                // 2. Global Broadcast (Public)
                broadcast(new \App\Events\GlobalNewProductEvent(
                    $supplierName,
                    $supplier ? $supplier->phone : null,
                    $product->name,
                    $product->price_usd, // Use USD attribute
                    $product->price,     // Use Price (SYR) attribute
                    $product->id,
                    $product->image_path
                ))->toOthers();

                // 3. Local Store Update (Private)
                broadcast(new \App\Events\InventoryUpdated($product->store_id))->toOthers();

            } catch (\Exception $e) {
                \Log::error("Broadcasting failed in ProductController: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'تم إضافة المنتج بنجاح.',
                'product' => $product->load('category')
            ], 201);
        });
    }

    public function show($slug, $id)
    {
        return Product::where('id', $id)
            ->whereHas('store', function($q) use ($slug) {
                $q->where('slug', $slug);
            })->firstOrFail();
    }

    public function update(Request $request, $slug, $id)
    {
        $product = Product::where('id', $id)
            ->whereHas('store', function($q) use ($slug) {
                $q->where('slug', $slug);
            })->firstOrFail();
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'barcode'        => ['nullable', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'price'          => 'nullable|numeric|min:0',
            'cost_price'     => 'nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'category_id'    => 'nullable|exists:categories,id',
            'description'    => 'nullable|string',
            'min_quantity'   => 'nullable|integer|min:0',
            'supplier_id'    => 'nullable|exists:suppliers,id',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $data = $validated;

        // Handle Image Upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = $path;
        }

        $product->update($data);

        // Trigger Real-time UI Refresh
        try {
            broadcast(new \App\Events\InventoryUpdated($product->store_id))->toOthers();
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'تم تحديث المنتج بنجاح.',
            'product' => $product->load('category')
        ]);
    }

    public function destroy($slug, $id)
    {
        $product = Product::where('id', $id)
            ->whereHas('store', function($q) use ($slug) {
                $q->where('slug', $slug);
            })->firstOrFail();
        
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return response()->json([
            'message' => 'تم حذف المنتج بنجاح.'
        ]);
    }

    public function bulkLinkToSupplier(Request $request, $slug)
    {
        $validated = $request->validate([
            'product_ids' => 'required|array',
            'product_ids.*' => 'exists:products,id',
            'supplier_id' => 'required|exists:suppliers,id',
        ]);

        Product::whereIn('id', $validated['product_ids'])->update([
            'supplier_id' => $validated['supplier_id']
        ]);

        return response()->json(['message' => 'تم ربط المنتجات بالمورد بنجاح.']);
    }
}
