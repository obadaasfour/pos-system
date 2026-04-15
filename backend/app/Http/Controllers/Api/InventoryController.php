<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    /**
     * Display a listing of products and their current stock levels.
     */
    public function index()
    {
        return Product::with(['category', 'batches' => function($q) {
            $q->where('remaining_qty', '>', 0);
        }])->get();
    }

    /**
     * Update the stock quantity for a product.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'stock_quantity' => 'required|integer',
            'action' => 'required|in:set,add,subtract'
        ]);

        $product = Product::findOrFail($id);

        switch ($request->action) {
            case 'add':
                $product->increment('stock_quantity', $request->stock_quantity);
                break;
            case 'subtract':
                $product->decrement('stock_quantity', $request->stock_quantity);
                break;
            case 'set':
                $product->stock_quantity = $request->stock_quantity;
                $product->save();
                break;
        }

        return response()->json([
            'message' => 'تم تحديث المخزون بنجاح.',
            'product' => $product
        ]);
    }

    /**
     * Search product by barcode.
     */
    public function getByBarcode($barcode)
    {
        $product = Product::with(['category', 'batches' => function($q) {
            $q->where('remaining_qty', '>', 0);
        }])->where('barcode', $barcode)->firstOrFail();
        
        return response()->json($product);
    }

    /**
     * Handle remote scanning from mobile device.
     */
    public function remoteScan(Request $request)
    {
        $request->validate([
            'barcode' => 'required|string',
            'sessionId' => 'required|string',
        ]);

        $barcode = $request->barcode;
        $sessionId = $request->sessionId;
        $storeId = \App\Models\TenantContext::getStoreId();

        // Find product to return confirmation info to the mobile app
        $product = Product::where('barcode', $barcode)->first();

        // Broadcast the event to the private scanner channel
        broadcast(new \App\Events\BarcodeScannedEvent($storeId, $sessionId, $barcode));

        return response()->json([
            'success' => true,
            'product_name' => $product ? $product->name : 'منتج غير معروف',
            'barcode' => $barcode
        ]);
    }
}
