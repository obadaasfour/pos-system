<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingOrder;
use App\Models\Store;
use App\Events\NewCustomerOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $store = Store::where('slug', $slug)->firstOrFail();
        $order = PendingOrder::where('store_id', $store->id)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:accepted,rejected',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Order status updated',
            'order' => $order
        ]);
    }
}
