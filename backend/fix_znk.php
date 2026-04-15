<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\ProductBatch;
use Illuminate\Support\Facades\DB;

// Fetch the latest item
$items = PurchaseItem::withoutGlobalScopes()->latest('id')->take(1)->get();

echo "Found " . $items->count() . " items with name like اجاص.\n";

foreach ($items as $item) {
    if (!$item) continue;
    echo "Processing item #{$item->id}\n";

    $wrongProduct = Product::withoutGlobalScopes()->find($item->product_id);
    if ($wrongProduct && $wrongProduct->name === 'زنك') {
        echo "Wrong product identified: Znk (ID: {$wrongProduct->id})\n";
        
        DB::transaction(function() use ($item, $wrongProduct) {
            $newProduct = Product::create([
                'store_id'       => $item->store_id,
                'category_id'    => $wrongProduct->category_id,
                'name'           => 'اجاص',
                'barcode'        => $item->temp_barcode ?? ('INT-' . time() . '-' . rand(1000, 9999)),
                'stock_quantity' => $item->quantity, 
                'price_syr'      => $wrongProduct->price_syr,
                'cost_price'     => $item->unit_cost_price
            ]);
            
            echo "Created new product: 'اجاص' (ID: {$newProduct->id})\n";

            $wrongProduct->decrement('stock_quantity', $item->quantity);
            echo "Restored Znk stock.\n";
            
            $batch = ProductBatch::find($item->batch_id);
            if ($batch) {
                $batch->update(['product_id' => $newProduct->id]);
                echo "Moved Batch #{$batch->id} to new product.\n";
            }

            $item->update(['product_id' => $newProduct->id]);
            echo "Updated PurchaseItem to point to new product.\n";
        });

        echo "Fix applied successfully for item #{$item->id}.\n";
    } else {
        echo "Could not identify Znk or product is already fixed.\n";
    }
}
