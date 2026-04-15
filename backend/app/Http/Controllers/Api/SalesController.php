<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Customer;
use App\Models\ProductBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['customer', 'user', 'items.product', 'store'])->latest();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        // ── UUID Idempotency Check ──
        if ($request->has('uuid')) {
            $existingOrder = Order::where('uuid', $request->uuid)->first();
            if ($existingOrder) {
                return response()->json([
                    'message' => 'تمت معالجة هذه الفاتورة مسبقاً (Idempotent)',
                    'order'   => $existingOrder->load(['items.product', 'user']),
                    'synced'  => true
                ], 200);
            }
        }

        $request->validate([
            'uuid'                 => 'required|string|max:50',
            'customer_id'          => 'nullable', // Can be numeric ID or UUID
            'payment_method'       => 'required|in:cash,credit',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required', // Can be numeric ID or UUID
            'items.*.quantity'     => 'required|integer|min:1',
        ]);

        // Resolve Customer ID if UUID is provided
        $customerId = $request->customer_id;
        if ($customerId && !is_numeric($customerId)) {
            $customer = Customer::where('uuid', $customerId)->first();
            $customerId = $customer ? $customer->id : null;
        }

        if ($request->payment_method === 'credit' && !$customerId) {
            return response()->json(['message' => 'يجب اختيار عميل للبيع الآجل.'], 422);
        }

        try {
            $lowStockProducts = [];

            $order = DB::transaction(function () use ($request, $customerId, &$lowStockProducts) {
                $totalAmount    = 0;
                $totalPurchasePrice = 0;
                $orderItemsData = [];

                foreach ($request->items as $item) {
                    $pid = $item['product_id'];
                    $product = is_numeric($pid) 
                        ? Product::lockForUpdate()->findOrFail($pid)
                        : Product::where('uuid', $pid)->lockForUpdate()->firstOrFail();

                    $requestedQty = $item['quantity'];
                    $batchId = $item['batch_id'] ?? null;

                    if ($product->stock_quantity < $requestedQty) {
                        throw new \Exception("الكمية غير كافية للمنتج: {$product->name}");
                    }

                    if (!$batchId) {
                        $batch = ProductBatch::where('product_id', $product->id)
                            ->where('remaining_qty', '>', 0)
                            ->orderBy('id', 'asc')
                            ->lockForUpdate()
                            ->first();
                        
                        if (!$batch) {
                            throw new \Exception("لا توجد وجبات نشطة للمنتج: {$product->name}");
                        }
                    } else {
                        $batch = is_numeric($batchId)
                            ? ProductBatch::where('id', $batchId)->where('product_id', $product->id)->lockForUpdate()->firstOrFail()
                            : ProductBatch::where('uuid', $batchId)->where('product_id', $product->id)->lockForUpdate()->firstOrFail();
                        
                        if ($batch->remaining_qty < $requestedQty) {
                            throw new \Exception("الكمية غير كافية في الوجبة المختارة للمنتج: {$product->name}");
                        }
                    }

                    $batchPrice = (float) $batch->sale_price;
                    $subtotal     = $batchPrice * $requestedQty;
                    $costSubtotal = $batch->cost_local * $requestedQty;
                    $totalAmount += $subtotal;
                    $totalPurchasePrice += $costSubtotal;

                    $orderItemsData[] = [
                        'product_id'     => $product->id,
                        'quantity'       => $requestedQty,
                        'unit_price'     => $batchPrice,
                        'unit_cost_price'=> $batch->cost_local,
                        'subtotal'       => $subtotal,
                        'batch_id'       => $batch->id,
                    ];

                    $batch->decrement('remaining_qty', $requestedQty);
                    $product->decrement('stock_quantity', $requestedQty);

                    // Collect products for notification (outside transaction)
                    $product->refresh();
                    if ($product->stock_quantity <= (int)$product->min_quantity) {
                        $lowStockProducts[] = $product;
                    }
                }

                $storeId = (int)($request->store_id ?? $request->user()->store_id);
                $maxInvoice = Order::where('store_id', $storeId)->max('invoice_number') ?? 0;

                $orderData = [
                    'uuid'           => $request->uuid,
                    'customer_id'    => $customerId,
                    'user_id'        => $request->user()->id,
                    'total_amount'   => $totalAmount,
                    'purchase_price' => $totalPurchasePrice,
                    'payment_method' => $request->payment_method,
                    'status'         => 'completed',
                    'invoice_number' => $maxInvoice + 1,
                    'store_id'       => $storeId,
                ];


                $order = Order::create($orderData);

                foreach ($orderItemsData as $itemData) {
                    $itemData['order_id'] = $order->id;
                    OrderItem::create($itemData);
                }

                if ($request->payment_method === 'cash') {
                    Setting::updateCashBalance($totalAmount);
                } else {
                    $customer = Customer::findOrFail($customerId);
                    $customer->increment('total_debt', $totalAmount);
                }

                return $order;
            });

            // ── Async-like Notifications & Shortage Checks (Post Commit) ──
            try {
                broadcast(new \App\Events\InventoryUpdated($order->store_id))->toOthers();
            } catch (\Exception $e) {
                \Log::warning("Broadcasting failed: " . $e->getMessage());
            }

            foreach ($lowStockProducts as $lowStockProduct) {
                try {
                    // 1. Internal Notification
                    $request->user()->notify(new \App\Notifications\LowStockNotification($lowStockProduct));
                    
                    // 2. Automated Shortage Request for Supplier
                    if ($lowStockProduct->supplier_id) {
                        // Create request if one doesn't already exist for this product at this store that is pending
                        \App\Models\ShortageRequest::firstOrCreate(
                            [
                                'store_id' => $lowStockProduct->store_id,
                                'product_id' => $lowStockProduct->id,
                                'status' => 'pending'
                            ],
                            [
                                'supplier_id' => $lowStockProduct->supplier_id,
                                'current_stock' => $lowStockProduct->stock_quantity,
                                'min_quantity' => $lowStockProduct->min_quantity
                            ]
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning("Post-Sale Automation failed: " . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'تمت عملية البيع بنجاح.',
                'order'   => $order->load(['items.product', 'user']),
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Order Creation Failed: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'message' => 'فشل إتمام عملية البيع: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        return Order::with(['items.product', 'user'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        // Only admin can update (e.g., status or customer)
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'غير مصرح لك بتعديل الفواتير.'], 403);
        }

        $order = Order::findOrFail($id);
        $order->update($request->only(['customer_id', 'status']));

        return response()->json(['message' => 'تم تحديث الفاتورة بنجاح.', 'order' => $order]);
    }

    public function destroy(Request $request, $id)
    {
        $order = Order::with('items')->findOrFail($id);

        return DB::transaction(function () use ($order) {
            // 1. Restore Stock
            foreach ($order->items as $item) {
                Product::where('id', $item->product_id)->increment('stock_quantity', $item->quantity);
            }

            // 2. Rollback Cash Balance
            Setting::updateCashBalance(-$order->total_amount);

            // 3. Delete Order (Cascades to items if foreign key is set correctly)
            $order->delete();

            return response()->json(['message' => 'تم حذف الفاتورة وإرجاع الكميات بنجاح.']);
        });
    }

    public function latestSale(Request $request)
    {
        $order = Order::where('user_id', $request->user()->id)
            ->with(['items.product', 'user', 'customer', 'store'])
            ->latest()
            ->first();

        if (!$order) {
            return response()->json(['message' => 'لا توجد فواتير سابقة.'], 404);
        }

        return response()->json(['order' => $order]);
    }
}
