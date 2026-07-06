<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingOrder;
use App\Models\Store;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Setting;
use App\Events\NewCustomerOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PendingOrderController extends Controller
{
    /**
     * Store a new pending order from the public menu.
     */
    public function store(Request $request, $slug)
    {
        $store = Store::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'customer_name_or_table' => 'required|string|max:255',
            'items' => 'required|array',
            'total_amount' => 'required|numeric',
        ]);

        $order = PendingOrder::create([
            'store_id' => $store->id,
            'customer_name_or_table' => $validated['customer_name_or_table'],
            'items' => $validated['items'],
            'total_amount' => $validated['total_amount'],
            'status' => 'pending',
        ]);

        // Broadcast to POS
        broadcast(new NewCustomerOrder($order))->toOthers();

        return response()->json([
            'message' => 'Order submitted successfully',
            'order' => $order
        ], 201);
    }

    /**
     * List pending orders for the POS.
     */
    public function index(Request $request, $slug)
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        
        $orders = PendingOrder::where('store_id', $store->id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * Update order status (accepted/rejected).
     */
    public function updateStatus(Request $request, $slug, $id)
    {
        try {
            $store = Store::where('slug', $slug)->firstOrFail();
            $order = PendingOrder::where('store_id', $store->id)->findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|in:accepted,rejected',
            ]);

            if ($validated['status'] === 'rejected') {
                $order->update(['status' => 'rejected']);
                return response()->json([
                    'message' => 'تم رفض الطلب بنجاح',
                    'order' => $order
                ]);
            }

            // Ensure we have an authenticated user (Cashier)
            if (!$request->user()) {
                return response()->json(['message' => 'يجب تسجيل الدخول ككاشير لقبول الطلبات'], 401);
            }

            // Logic for 'accepted' -> Process as a full sale
            $processedOrder = DB::transaction(function () use ($order, $store, $request) {
                $totalAmount = 0;
                $totalPurchasePrice = 0;
                $orderItemsData = [];

                foreach ($order->items as $item) {
                    $rawId = $item['id'];
                    $productId = null;
                    $specificBatchId = null;

                    // Handle prefixed IDs (e.g., "batch-123")
                    if (is_string($rawId) && strpos($rawId, 'batch-') === 0) {
                        $specificBatchId = (int) str_replace('batch-', '', $rawId);
                        $batch = ProductBatch::where('store_id', $store->id)->findOrFail($specificBatchId);
                        $productId = $batch->product_id;
                    } else {
                        $productId = (int)$rawId;
                    }

                    $product = Product::where('store_id', $store->id)->lockForUpdate()->findOrFail($productId);
                    $requestedQty = (int)$item['quantity'];

                    if ($product->stock_quantity < $requestedQty) {
                        throw new \Exception("الكمية غير كافية للمنتج: {$product->name} (المتوفر: {$product->stock_quantity})");
                    }

                    $remainingToFulfill = $requestedQty;

                    // 1. If we have a specific batch ID, try to fulfill from it first
                    if ($specificBatchId) {
                        $batch = ProductBatch::where('id', $specificBatchId)
                            ->where('store_id', $store->id)
                            ->where('remaining_qty', '>', 0)
                            ->lockForUpdate()
                            ->first();

                        if ($batch) {
                            $fulfillQty = min($batch->remaining_qty, $remainingToFulfill);
                            
                            $batchPrice = (float) $batch->sale_price;
                            $subtotal = $batchPrice * $fulfillQty;
                            $costSubtotal = $batch->cost_local * $fulfillQty;
                            
                            $totalAmount += $subtotal;
                            $totalPurchasePrice += $costSubtotal;

                            $orderItemsData[] = [
                                'store_id'       => $store->id,
                                'product_id'     => $product->id,
                                'quantity'       => $fulfillQty,
                                'unit_price'     => $batchPrice,
                                'unit_cost_price'=> $batch->cost_local,
                                'subtotal'       => $subtotal,
                                'batch_id'       => $batch->id,
                            ];

                            $batch->decrement('remaining_qty', $fulfillQty);
                            $remainingToFulfill -= $fulfillQty;
                        }
                    }

                    // 2. If there's still quantity to fulfill, use FIFO for other batches
                    if ($remainingToFulfill > 0) {
                        $batches = ProductBatch::where('product_id', $product->id)
                            ->where('store_id', $store->id)
                            ->where('remaining_qty', '>', 0)
                            ->where('id', '!=', $specificBatchId) // Avoid double processing the same batch
                            ->orderBy('id', 'asc')
                            ->lockForUpdate()
                            ->get();

                        foreach ($batches as $batch) {
                            if ($remainingToFulfill <= 0) break;

                            $fulfillQty = min($batch->remaining_qty, $remainingToFulfill);
                            
                            $batchPrice = (float) $batch->sale_price;
                            $subtotal = $batchPrice * $fulfillQty;
                            $costSubtotal = $batch->cost_local * $fulfillQty;
                            
                            $totalAmount += $subtotal;
                            $totalPurchasePrice += $costSubtotal;

                            $orderItemsData[] = [
                                'store_id'       => $store->id,
                                'product_id'     => $product->id,
                                'quantity'       => $fulfillQty,
                                'unit_price'     => $batchPrice,
                                'unit_cost_price'=> $batch->cost_local,
                                'subtotal'       => $subtotal,
                                'batch_id'       => $batch->id,
                            ];

                            $batch->decrement('remaining_qty', $fulfillQty);
                            $remainingToFulfill -= $fulfillQty;
                        }
                    }

                    if ($remainingToFulfill > 0) {
                        throw new \Exception("لا توجد كمية كافية في الوجبات للمنتج: {$product->name}");
                    }

                    $product->decrement('stock_quantity', $requestedQty);
                }

                $maxInvoice = Order::where('store_id', $store->id)->max('invoice_number') ?? 0;

                $newOrder = Order::create([
                    'uuid'           => (string) Str::uuid(),
                    'customer_id'    => null,
                    'user_id'        => $request->user()->id,
                    'total_amount'   => $totalAmount,
                    'purchase_price' => $totalPurchasePrice,
                    'payment_method' => 'cash',
                    'status'         => 'completed',
                    'invoice_number' => $maxInvoice + 1,
                    'store_id'       => $store->id,
                ]);

                foreach ($orderItemsData as $itemData) {
                    $itemData['order_id'] = $newOrder->id;
                    OrderItem::create($itemData);
                }

                Setting::updateCashBalance($totalAmount, $store->id);
                
                $order->update(['status' => 'accepted']);

                return $newOrder;
            });

            // Broadcast updates
            broadcast(new \App\Events\InventoryUpdated($store->id))->toOthers();

            return response()->json([
                'status'  => 'success',
                'message' => 'تم قبول الطلب وإصدار فاتورة رقم #' . $processedOrder->invoice_number,
                'order'   => $processedOrder->load(['items.product', 'user']),
                'invoice_number' => $processedOrder->invoice_number
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'بيانات غير صالحة', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('Accept Order Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'status'  => 'error',
                'message' => 'فشل معالجة الطلب: ' . $e->getMessage()
            ], 500);
        }
    }
}
