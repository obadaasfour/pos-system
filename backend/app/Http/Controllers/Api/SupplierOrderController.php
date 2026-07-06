<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Supplier;
use App\Models\Product;
use App\Models\SupplierOrder;

use App\Notifications\B2BOrderStatusNotification;
use App\Notifications\NewB2BOrderNotification;
use Notification;

class SupplierOrderController extends Controller
{
    public function store(Request $request, $slug)
    {
        $validated = $request->validate([
            'product_id'  => 'required|exists:products,id',
            'quantity'    => 'required|integer|min:1',
            'supplier_id' => 'required|exists:suppliers,id',
        ]);

        // 1. Security Check: ensure the product actually belongs to the provided supplier
        $product = Product::withoutGlobalScopes()
            ->where('id', $validated['product_id'])
            ->where('supplier_id', $validated['supplier_id'])
            ->with(['supplier.user', 'batches'])
            ->firstOrFail();
        
        // 2. Resolve Store ID from Slug
        $store = \App\Models\Store::where('slug', $slug)->firstOrFail();
        $storeId = $store->id;
        $storeName = $store->name;

        // 3. Create Order Snapshot
        $order = SupplierOrder::create([
            'store_id'            => $storeId,
            'product_id'          => $validated['product_id'],
            'supplier_id'         => $validated['supplier_id'],
            'quantity'            => $validated['quantity'],
            'status'              => 'pending',
            'price_at_order_usd'  => $product->price_usd,
            'price_at_order_syr'  => $product->price, // getPriceAttribute (local SYR)
        ]);

        // Notify Supplier (Push + WebSockets)
        if ($product->supplier && $product->supplier->user) {
            $product->supplier->user->notify(new NewB2BOrderNotification(
                $storeName,
                $product->name ?? 'منتج غير محدد',
                $validated['quantity']
            ));
            
            try {
                broadcast(new \App\Events\NewSupplierOrderEvent($order))->toOthers();
            } catch (\Exception $e) {
                \Log::error("B2B Broadcast Error: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'تم إرسال طلب التوريد بنجاح.',
            'order'   => $order->load('product')
        ], 201);
    }

    /**
     * List all B2B orders for the authenticated supplier.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $supplier = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $orders = SupplierOrder::with(['product', 'store', 'suggestion'])
            ->where('supplier_id', $supplier->id)
            ->latest()
            ->get();

        return response()->json($orders);
    }

    /**
     * Update the status of a B2B order.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,processing,shipped,completed,cancelled'
        ]);

        $order = SupplierOrder::with(['product' => function($q) {
            $q->withoutGlobalScopes();
        }, 'store', 'suggestion'])->findOrFail($id);

        $oldStatus = $order->status;
        $order->status = $request->status;
        
        if ($request->status === 'shipped') {
            $order->shipped_at = now();
            $order->tracking_number = $request->tracking_number ?? 'B2B-' . strtoupper(uniqid());
        }
        
        $order->save();

        // Use safe variables and null-safe operators
        $productName = $order->product?->name ?? $order->suggestion?->name ?? 'منتج غير محدد';
        $storeName = $order->store?->name ?? 'متجر غير محدد';

        // 1. Send Notifications to Store Admins
        if ($order->store) {
            $adminUsers = \App\Models\User::where('store_id', $order->store_id)
                ->where('role', \App\Models\User::ROLE_ADMIN)
                ->get();

            $message = "";
            $url = "";

            if ($request->status === 'processing') {
                $message = "قام المورد بتحديث حالة طلبك للمنتج ({$productName}) إلى: جاري التجهيز 📦";
            } elseif ($request->status === 'shipped') {
                $message = "قام المورد بشحن طلبك للمنتج ({$productName})، توجد فاتورة مشتريات جديدة معلقة بانتظار مراجعتك لاعتماد المخزن. 🚀";
                $url = "/purchases";
            }

            if ($message) {
                Notification::send($adminUsers, new B2BOrderStatusNotification(
                    $order->id,
                    $productName,
                    $request->status,
                    $message,
                    $url
                ));

                // Also broadcast a custom event for easier frontend data refresh (Zero-Reload Live Sync)
                try {
                    broadcast(new \App\Events\B2BOrderStatusEvent(
                        $order->id,
                        $productName,
                        $request->status,
                        $message,
                        $order->store_id
                    ))->toOthers();
                } catch (\Exception $e) {
                    \Log::error("B2B Status Broadcast Error: " . $e->getMessage());
                }
            }
        }

        // 2. Automated Purchase Invoice on 'shipped'
        if ($request->status === 'shipped' && $oldStatus !== 'shipped') {
            $exchangeRate = \App\Models\Setting::get('exchange_rate', 1);
            
            // Get a store admin to link the purchase to
            $storeAdmin = \App\Models\User::where('store_id', $order->store_id)
                ->where('role', \App\Models\User::ROLE_ADMIN)
                ->first();

            $purchase = \App\Models\Purchase::create([
                'store_id'          => $order->store_id,
                'supplier_id'       => $order->supplier_id,
                'user_id'           => $storeAdmin ? $storeAdmin->id : $request->user()->id,
                'total_amount'      => $order->quantity * ($order->price_at_order_usd ?? $order->suggestion?->price_usd ?? 0),
                'notes'             => "طلب B2B تلقائي رقم #{$order->id} لمتجر {$storeName}",
                'exchange_rate'     => $exchangeRate,
                'invoice_number'    => 'B2B-' . $order->id . '-' . time(),
                'status'            => 'pending_approval',
            ]);

            \App\Models\PurchaseItem::create([
                'store_id'          => $order->store_id,
                'purchase_id'       => $purchase->id,
                'product_id'        => $order->product_id, // Could be null
                'temp_product_name' => $order->product_id ? null : $productName,
                'temp_image_path'   => $order->product_id ? $order->product?->image_path : ($order->suggestion?->image_path ?? null),
                'quantity'          => $order->quantity,
                'unit_cost_price'   => $order->price_at_order_usd ?? $order->suggestion?->price_usd ?? 0,
                'subtotal'          => $order->quantity * ($order->price_at_order_usd ?? $order->suggestion?->price_usd ?? 0),
            ]);
        }

        return response()->json([
            'message' => 'تم تحديث حالة الطلب بنجاح.',
            'order'   => $order->fresh(['product', 'store'])
        ]);
    }
}
