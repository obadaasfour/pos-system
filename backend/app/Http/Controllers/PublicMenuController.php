<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Product;
use Illuminate\Http\Request;

class PublicMenuController extends Controller
{
    /**
     * Get products for a specific store slug (unauthenticated).
     */
    public function getMenu($slug)
    {
        $store = Store::where('slug', $slug)->where('is_active', true)->first();

        if (!$store) {
            return response()->json(['message' => 'المتجر غير موجود أو غير نشط'], 404);
        }

        // Fetch all active batches with their products and categories
        $batches = \App\Models\ProductBatch::where('store_id', $store->id)
            ->where('remaining_qty', '>', 0)
            ->with(['product' => function($q) {
                $q->withoutGlobalScopes()->with(['category' => function($cq) {
                    $cq->select('id', 'name');
                }])->select('id', 'category_id', 'name', 'description', 'image_path');
            }])
            ->get();

        $rate = (float) \App\Models\Setting::get('exchange_rate', 1);
        if ($rate <= 0) $rate = 1;

        // Flatten the batches into a "Product-like" structure for the frontend
        $items = $batches->map(function($batch) use ($rate, $batches) {
            $p = $batch->product;
            if (!$p) return null;

            $price = (float) $batch->sale_price;
            $currency = $batch->price_currency ?: 'SYP';

            // Apply the logic: USD base -> multiply, SYP base -> divide
            $priceSyr = ($currency === 'USD') ? round($price * $rate, 0) : $price;
            $priceUsd = ($currency === 'USD') ? $price : round($price / $rate, 2);

            // Logic for "New Price" tag: if there's a batch with a higher ID for the same product?
            // Actually, mark it as "New" if it's the latest batch for this product.
            $isLatest = !$batches->where('product_id', $batch->product_id)->where('id', '>', $batch->id)->first();
            $hasMultiple = $batches->where('product_id', $batch->product_id)->count() > 1;

            return [
                'id'             => "batch-{$batch->id}",
                'product_id'     => $p->id,
                'name'           => $p->name,
                'description'    => $p->description,
                'category'       => $p->category,
                'image_url'      => $p->image_url,
                'price'          => $priceSyr,
                'price_usd'      => $priceUsd,
                'stock_quantity' => $batch->remaining_qty,
                'is_new_price'   => $isLatest && $hasMultiple,
            ];
        })->filter()->values();

        return response()->json([
            'store' => [
                'name'    => $store->name,
                'logo'    => $store->logo,
                'address' => $store->address,
                'phone'   => $store->phone,
            ],
            'exchange_rate' => $rate,
            'products'      => $items
        ]);
    }
}
