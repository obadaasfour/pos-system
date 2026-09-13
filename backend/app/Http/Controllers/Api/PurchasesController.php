<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\Setting;
use App\Models\ProductBatch;
use App\Models\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchasesController extends Controller
{
    /**
     * قائمة فواتير الشراء (للأدمن فقط)
     */
    public function index()
    {
        return Purchase::with(['supplier', 'user', 'items.product' => function($q) { $q->withTrashed()->withoutGlobalScopes(); }, 'batches'])->latest()->paginate(15);
    }

    /**
     * إنشاء فاتورة شراء جديدة:
     * - تزيد stock_quantity لكل منتج
     * - تُحدِّث cost_price للمنتج بآخر سعر تكلفة
     */
    public function store(Request $request)
    {
        $request->validate([
            'supplier_id'              => 'nullable|exists:suppliers,id',
            'notes'                    => 'nullable|string',
            'exchange_rate'            => 'required|numeric|min:1',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|exists:products,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.unit_cost_usd'    => 'required|numeric|min:0',
            'items.*.unit_sale_price'  => 'required|numeric|min:0',
            'items.*.planned_price_usd'=> 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $totalAmount    = 0;
            $purchaseItems  = [];
            $exchangeRate   = $request->exchange_rate;

            $storeId = $request->user()->store_id;
            $maxInvoice = Purchase::where('store_id', $storeId)->max('invoice_number');

            $purchase = Purchase::create([
                'store_id'      => $storeId,
                'supplier_id'   => $request->supplier_id,
                'user_id'       => $request->user()->id,
                'total_amount'  => 0, // Will update after calculation
                'notes'         => $request->notes,
                'exchange_rate' => $exchangeRate,
                'invoice_number'=> ((int)$maxInvoice) + 1,
            ]);

            foreach ($request->items as $item) {
                $product     = Product::lockForUpdate()->findOrFail($item['product_id']);
                
                $costLocal   = round($item['unit_cost_usd'] * $exchangeRate, 2);
                $subtotal    = round($costLocal * $item['quantity'], 2);
                $totalAmount += $subtotal;

                // Search for an existing batch with EXACT same prices and store context to Merge
                $existingBatch = ProductBatch::where('store_id', $storeId)
                    ->where('product_id', $product->id)
                    ->where('cost_local', $costLocal)
                    ->where('sale_price', $item['unit_sale_price'])
                    ->first();

                if ($existingBatch) {
                    $existingBatch->increment('original_quantity', $item['quantity']);
                    $existingBatch->increment('remaining_qty', $item['quantity']);
                    $batchId = $existingBatch->id;
                } else {
                    // Create New Batch
                    $newBatch = ProductBatch::create([
                        'store_id'          => $storeId,
                        'product_id'        => $product->id,
                        'purchase_id'       => $purchase->id,
                        'original_quantity' => $item['quantity'],
                        'remaining_qty'     => $item['quantity'],
                        'cost_usd'          => $item['unit_cost_usd'],
                        'exchange_rate'     => $exchangeRate,
                        'cost_local'        => $costLocal,
                        'sale_price'        => $item['unit_sale_price'],
                        'planned_price_usd' => $item['planned_price_usd'] ?? 0,
                        'sale_price_usd'    => $item['planned_price_usd'] ?? 0,
                    ]);
                    $batchId = $newBatch->id;
                }

                // Update Overall Stock & Planned Price
                $product->increment('stock_quantity', $item['quantity']);
                if (isset($item['planned_price_usd']) && (float)$item['planned_price_usd'] > 0) {
                    $product->update([
                        'planned_price_usd' => $item['planned_price_usd'],
                        'sale_price_usd'    => $item['planned_price_usd']
                    ]);
                }

                $purchaseItems[] = [
                    'store_id'       => $storeId,
                    'purchase_id'    => $purchase->id,
                    'product_id'     => $product->id,
                    'quantity'       => $item['quantity'],
                    'unit_cost_price'=> $costLocal,
                    'subtotal'       => $subtotal,
                    'batch_id'       => $batchId
                ];
            }

            $purchase->update(['total_amount' => round($totalAmount, 2)]);

            foreach ($purchaseItems as $itemData) {
                PurchaseItem::create($itemData);
            }

            // تحديث الخزينة: خصم قيمة المشتريات
            Setting::updateCashBalance(-round($totalAmount, 2));

            try {
                broadcast(new \App\Events\InventoryUpdated($storeId))->toOthers();
            } catch (\Exception $e) {}

            return response()->json([
                'message'  => 'تمت عملية الشراء بنجاح. تم إنشاء وجبات جديدة وتحديث المخزون.',
                'purchase' => $purchase->load(['items.product', 'supplier', 'batches']),
            ], 201);
        });
    }

    /**
     * قائمة المشتريات المعلقة بانتظار التأكيد
     */
    public function incomingIndex()
    {
        return Purchase::with(['supplier', 'user', 'items.product' => function($q) { $q->withTrashed()->withoutGlobalScopes(); }])
            ->whereIn('status', ['pending_confirmation', 'pending_approval'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * تأكيد استلام المشتريات وتحديث المخزون
     */
    public function confirmReceipt(Request $request, $slug, $id)
    {
        $prices = $request->input('prices', []); // [item_id => sale_price, ...]

        if (empty($prices)) {
            return response()->json(['message' => 'يرجى تزويد أسعار المبيع لجميع العناصر.'], 422);
        }

        return DB::transaction(function () use ($id, $prices) {
            $purchase = Purchase::with(['items'])->findOrFail($id);
            
            if (!in_array($purchase->status, ['pending_confirmation', 'pending_approval'])) {
                throw new \Exception('هذه الفاتورة مؤكدة مسبقاً أو غير صالحة للتأكيد.');
            }

            $storeId = $purchase->store_id;
            $exchangeRate = $purchase->exchange_rate;

            // Ensure General category exists for fallback
            $generalCategory = \App\Models\Category::firstOrCreate(['name' => 'General', 'store_id' => $storeId]);

            foreach ($purchase->items as $item) {
                // Try to find the product (including soft deleted)
                $product = null;
                if ($item->product_id) {
                    // Search ONLY in local products to avoid treating supplier products as local counterparts by accident
                    $product = Product::withTrashed()->where('store_id', $storeId)->find($item->product_id);
                }

                // Product Matching Logic (Prioritize Name for Manual Control)
                if (!$product) {
                    $productName = trim($item->temp_product_name ?? $item->product?->name ?? ('منتج جديد من فاتورة #' . $id));
                    
                    if (!empty($productName)) {
                        $product = Product::withTrashed()
                            ->where('store_id', $storeId)
                            ->where('name', $productName)
                            ->first();
                    }
                    
                    if (!$product) {
                        // 1. Create New Product Record
                        $product = Product::create([
                            'store_id'       => $storeId,
                            'category_id'    => $generalCategory->id,
                            'name'           => $productName,
                            'barcode'        => null, // Barcode left empty as requested
                            'stock_quantity' => 0,
                            'price_syr'      => (float) ($prices[$item->id] ?? 0),
                            'cost_price'     => (float) $item->unit_cost_price
                        ]);

                        // 2. Independent Image Synchronization (Asset Security)
                        if (!empty($item->temp_image_path) && \Storage::disk('public')->exists($item->temp_image_path)) {
                            try {
                                $extension = pathinfo($item->temp_image_path, PATHINFO_EXTENSION);
                                $newPath = 'products/' . \Illuminate\Support\Str::uuid() . '.' . $extension;
                                
                                \Storage::disk('public')->copy($item->temp_image_path, $newPath);
                                $product->update(['image_path' => $newPath]);
                            } catch (\Exception $e) {
                                \Log::error("Procurement Image Sync Error: " . $e->getMessage());
                            }
                        }
                    }
                }

                // If it was soft-deleted, restore it as it's now back in stock
                if ($product->trashed()) {
                    $product->restore();
                }

                $itemPricing = $prices[$item->id] ?? [];
                $newSalePrice = (float) ($itemPricing['syp'] ?? $product->price);
                $plannedUsd   = (float) ($itemPricing['usd'] ?? $product->planned_price_usd ?? 0);
                $invoiceCost  = (float) $item->unit_cost_price;

                // 1. Update overall product stock and price
                $product->increment('stock_quantity', $item->quantity);
                $product->update([
                    'price_syr'         => $newSalePrice,
                    'planned_price_usd' => $plannedUsd,
                    'sale_price_usd'    => $plannedUsd,
                    'cost_price'        => $invoiceCost
                ]);

                // 2. Create a batch for this item
                $batch = ProductBatch::create([
                    'store_id'          => $storeId,
                    'product_id'        => $product->id,
                    'purchase_id'       => $purchase->id,
                    'original_quantity' => $item->quantity,
                    'remaining_qty'     => $item->quantity,
                    'cost_usd'          => round($invoiceCost / $exchangeRate, 2),
                    'exchange_rate'     => $exchangeRate,
                    'cost_local'        => $invoiceCost,
                    'sale_price'        => $newSalePrice,
                    'planned_price_usd' => $plannedUsd,
                    'sale_price_usd'    => $plannedUsd,
                ]);

                // 3. Update purchase item
                $item->update([
                    'product_id' => $product->id,
                    'batch_id'   => $batch->id
                ]);
            }

            // Update Purchase Status
            $purchase->update(['status' => 'received']);

            // Update Treasury
            Setting::updateCashBalance(-$purchase->total_amount);

            try {
                broadcast(new \App\Events\InventoryUpdated($storeId))->toOthers();
            } catch (\Exception $e) {}

            return response()->json(['message' => 'تم تأكيد الاستلام وتحديث المخزون والأسعار بدقة ✅']);
        });
    }

    public function show($slug, $id = null)
    {
        $purchaseId = $id ?: $slug;
        return Purchase::with(['supplier', 'user', 'items.product' => function($q) { $q->withTrashed()->withoutGlobalScopes(); }, 'batches'])->findOrFail($purchaseId);
    }

    /**
     * تعديل فاتورة شراء (للأدمن والسوبر أدمن)
     */
    public function update(Request $request, $slug, $id = null)
    {
        if (! $request->user() || ! $request->user()->isAdmin()) {
            return response()->json(['message' => 'غير مصرح لك بتعديل فواتير المشتريات.'], 403);
        }

        $purchaseId = $id ?: $slug;

        $request->validate([
            'supplier_id'              => 'nullable|exists:suppliers,id',
            'notes'                    => 'nullable|string',
            'exchange_rate'            => 'required|numeric|min:1',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|exists:products,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.unit_cost_usd'    => 'required|numeric|min:0',
            'items.*.unit_sale_price'  => 'required|numeric|min:0',
            'items.*.planned_price_usd'=> 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request, $purchaseId) {
            $purchase = Purchase::with(['items', 'batches'])->findOrFail($purchaseId);
            $storeId = $purchase->store_id;
            TenantContext::setStoreId($storeId);
            $exchangeRate = $request->exchange_rate;

            $wasFinalized = in_array($purchase->status, ['received', 'completed', 'paid']);

            // 1. إذا كانت الفاتورة مستلمة مسبقاً، نعكس أثر العناصر القديمة على المخزون والخزينة
            if ($wasFinalized) {
                foreach ($purchase->items as $oldItem) {
                    if ($oldItem->product_id) {
                        $oldProduct = Product::withTrashed()->find($oldItem->product_id);
                        if ($oldProduct) {
                            $oldProduct->decrement('stock_quantity', min($oldProduct->stock_quantity, $oldItem->quantity));
                        }
                    }
                    if ($oldItem->batch_id) {
                        $oldBatch = ProductBatch::find($oldItem->batch_id);
                        if ($oldBatch) {
                            $oldBatch->decrement('remaining_qty', min($oldBatch->remaining_qty, $oldItem->quantity));
                            $oldBatch->decrement('original_quantity', min($oldBatch->original_quantity, $oldItem->quantity));
                        }
                    }
                }
                // إعادة المبلغ القديم للخزينة مؤقتاً
                Setting::updateCashBalance(round((float)$purchase->total_amount, 2));
            }

            // 2. حذف الباتشات القديمة المنشأة بواسطة هذه الفاتورة حصراً وعناصر الفاتورة
            ProductBatch::where('purchase_id', $purchase->id)->delete();
            $purchase->items()->delete();

            // 3. تطبيق العناصر الجديدة
            $totalAmount   = 0;
            $purchaseItems = [];

            foreach ($request->items as $item) {
                $product   = Product::lockForUpdate()->findOrFail($item['product_id']);
                $costLocal = round($item['unit_cost_usd'] * $exchangeRate, 2);
                $subtotal  = round($costLocal * $item['quantity'], 2);
                $totalAmount += $subtotal;

                $batchId = null;
                if ($wasFinalized) {
                    $batch = ProductBatch::create([
                        'store_id'          => $storeId,
                        'product_id'        => $product->id,
                        'purchase_id'       => $purchase->id,
                        'original_quantity' => $item['quantity'],
                        'remaining_qty'     => $item['quantity'],
                        'cost_usd'          => $item['unit_cost_usd'],
                        'exchange_rate'     => $exchangeRate,
                        'cost_local'        => $costLocal,
                        'sale_price'        => $item['unit_sale_price'],
                        'planned_price_usd' => $item['planned_price_usd'] ?? 0,
                        'sale_price_usd'    => $item['planned_price_usd'] ?? 0,
                    ]);
                    $batchId = $batch->id;

                    $product->increment('stock_quantity', $item['quantity']);
                    if (isset($item['planned_price_usd']) && (float)$item['planned_price_usd'] > 0) {
                        $product->update([
                            'planned_price_usd' => $item['planned_price_usd'],
                            'sale_price_usd'    => $item['planned_price_usd']
                        ]);
                    }
                }

                $purchaseItems[] = [
                    'store_id'       => $storeId,
                    'purchase_id'    => $purchase->id,
                    'product_id'     => $product->id,
                    'quantity'       => $item['quantity'],
                    'unit_cost_price'=> $costLocal,
                    'subtotal'       => $subtotal,
                    'batch_id'       => $batchId,
                ];
            }

            // 4. تحديث بيانات الفاتورة
            $purchase->update([
                'supplier_id'   => $request->supplier_id,
                'notes'         => $request->notes,
                'exchange_rate' => $exchangeRate,
                'total_amount'  => round($totalAmount, 2),
            ]);

            foreach ($purchaseItems as $itemData) {
                PurchaseItem::create($itemData);
            }

            // 5. خصم المبلغ الجديد من الخزينة
            if ($wasFinalized) {
                Setting::updateCashBalance(-round($totalAmount, 2));
            }

            try {
                broadcast(new \App\Events\InventoryUpdated($storeId))->toOthers();
            } catch (\Exception $e) {}

            return response()->json([
                'message'  => 'تم تحديث فاتورة الشراء وتعديل المخزون بنجاح ✅',
                'purchase' => $purchase->fresh()->load(['items.product', 'supplier', 'batches']),
            ]);
        });
    }

    /**
     * حذف فاتورة شراء (للسوبر أدمن فقط)
     */
    public function destroy(Request $request, $slug, $id = null)
    {
        if (! $request->user() || ! $request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'غير مصرح لك. حذف فواتير المشتريات متاح فقط للسوبر أدمن.'], 403);
        }

        $purchaseId = $id ?: $slug;

        return DB::transaction(function () use ($purchaseId) {
            $purchase = Purchase::with(['items.product', 'batches'])->findOrFail($purchaseId);
            $storeId = $purchase->store_id;
            TenantContext::setStoreId($storeId);

            // إذا كانت الفاتورة مستلمة ومكتملة، نقوم بعكس التأثير على المخزون والخزينة
            if (in_array($purchase->status, ['received', 'completed', 'paid'])) {
                foreach ($purchase->items as $item) {
                    if ($item->product_id) {
                        $product = Product::withTrashed()->find($item->product_id);
                        if ($product) {
                            $product->decrement('stock_quantity', min($product->stock_quantity, $item->quantity));
                        }
                    }

                    if ($item->batch_id) {
                        $batch = ProductBatch::find($item->batch_id);
                        if ($batch) {
                            if ($batch->purchase_id == $purchase->id && $batch->original_quantity <= $item->quantity) {
                                $batch->delete();
                            } else {
                                $batch->decrement('remaining_qty', min($batch->remaining_qty, $item->quantity));
                                $batch->decrement('original_quantity', min($batch->original_quantity, $item->quantity));
                            }
                        }
                    }
                }

                // عكس الخزينة (إعادة المبلغ المخصوم)
                Setting::updateCashBalance(round((float)$purchase->total_amount, 2));
            }

            // حذف الباتشات المرتبطة حصراً بهذه الفاتورة
            ProductBatch::where('purchase_id', $purchase->id)->delete();

            // حذف عناصر الفاتورة ثم الفاتورة نفسها
            $purchase->items()->delete();
            $purchase->delete();

            try {
                broadcast(new \App\Events\InventoryUpdated($storeId))->toOthers();
            } catch (\Exception $e) {}

            return response()->json(['message' => 'تم حذف فاتورة الشراء وعكس حركتها بنجاح 🗑️']);
        });
    }
}
