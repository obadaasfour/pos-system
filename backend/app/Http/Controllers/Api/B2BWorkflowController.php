<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSuggestion;
use App\Models\SupplierOrder;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class B2BWorkflowController extends Controller
{
    /**
     * Get all pending proposals targeted to this store or global (no targets = for everyone).
     */
    public function index(Request $request, $slug)
    {
        $storeId = $request->user()->store_id;

        try {
            $proposals = ProductSuggestion::with(['supplier', 'category'])
                ->withoutGlobalScopes()
                ->where('status', 'pending')
                ->where('created_at', '>=', now()->subDays(3))
                ->where(function($query) use ($storeId) {
                    // Case 1: Specifically targeted to this store
                    $query->whereHas('targetStores', function($q) use ($storeId) {
                        $q->where('store_id', $storeId);
                    });

                    // Case 2: No targets attached at all = targeted to everyone
                    $query->orWhereDoesntHave('targetStores');
                })
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($proposals);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("B2B Proposals fetch error: " . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store orders a suggested product.
     */
    public function orderProposal(Request $request, $slug, $id)
    {
        try {
            $suggestion = ProductSuggestion::withoutGlobalScopes()->findOrFail($id);

            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            $storeId = $request->user()->store_id;

            if (!$suggestion->supplier_id) {
                return response()->json(['message' => 'هذا الاقتراح لا يحتوي على مورد مرتبط به.'], 422);
            }

            return DB::transaction(function () use ($suggestion, $validated, $storeId) {
                $order = SupplierOrder::create([
                    'store_id'            => $storeId,
                    'product_id'          => null,
                    'suggestion_id'       => $suggestion->id,
                    'supplier_id'         => $suggestion->supplier_id,
                    'quantity'            => $validated['quantity'],
                    'status'              => 'pending',
                    'price_at_order_usd'  => $suggestion->price_usd,
                ]);

                $suggestion->update(['status' => 'ordered']);

                // Notify Supplier (Real-time Broadcast + Database Notification)
                if ($suggestion->supplier && $suggestion->supplier->user) {
                    $suggestion->supplier->user->notify(new \App\Notifications\NewB2BOrderNotification(
                        $request->user()->store->name ?? 'متجر',
                        $suggestion->name,
                        $validated['quantity']
                    ));

                    try {
                        broadcast(new \App\Events\NewSupplierOrderEvent($order))->toOthers();
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("B2B Broadcast Error: " . $e->getMessage());
                    }
                }

                return response()->json([
                    'message' => 'تم طلب المنتج بنجاح. بانتظار شحن المورد.',
                    'order'   => $order
                ]);
            });

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => "لم يتم العثور على المقترح رقم #{$id}."], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'بيانات غير صالحة.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("orderProposal Critical Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'line'    => $e->getLine(),
                'file'    => $e->getFile()
            ], 500);
        }
    }

    /**
     * Store receives the order and sets final prices.
     */
    public function receiveAndPrice(Request $request, $slug, $id)
    {
        $order = SupplierOrder::where('store_id', $request->user()->store_id)
            ->where('status', 'shipped')
            ->findOrFail($id);

        $validated = $request->validate([
            'price_syr'         => 'required|numeric|min:0',
            'price_usd_planned' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($order, $validated) {
            $suggestion = ProductSuggestion::findOrFail($order->suggestion_id);

            // 1. Create the Product in this store
            $product = Product::create([
                'store_id'       => $order->store_id,
                'name'           => $suggestion->name,
                'description'    => $suggestion->description,
                'image_path'     => $suggestion->image_path,
                'category_id'    => $suggestion->category_id,
                'supplier_id'    => $suggestion->supplier_id,
                'price'          => $validated['price_syr'],
                'price_usd'      => $validated['price_usd_planned'],
                'cost_price'     => $order->price_at_order_usd, // This is the USD cost
                'stock_quantity' => $order->quantity,
            ]);

            // 2. Update Order
            $order->update([
                'product_id'  => $product->id,
                'status'      => 'completed',
                'received_at' => now(),
            ]);

            // 3. Finalize the Purchase record
            $purchase = Purchase::where('invoice_number', 'LIKE', "B2B-{$order->id}-%")->first();
            if ($purchase) {
                $purchase->update(['status' => 'completed']);
            }

            return response()->json([
                'message' => 'تم استلام المنتج وتسعيره بنجاح. أصبح الآن متاحاً في نقطة البيع.',
                'product' => $product
            ]);
        });
    }
}
