<?php

use App\Models\Product;
use App\Models\ProductBatch;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

DB::transaction(function() {
    $products = Product::where('stock_quantity', '>', 0)->get();
    $count = 0;

    foreach ($products as $product) {
        // Calculate existing batch total
        $batchSum = ProductBatch::where('product_id', $product->id)->sum('remaining_qty');
        $leftover = $product->stock_quantity - $batchSum;

        if ($leftover > 0) {
            ProductBatch::create([
                'product_id'        => $product->id,
                'original_quantity' => $leftover,
                'remaining_qty'     => $leftover,
                'cost_local'        => $product->cost_price ?? 0,
                'sale_price'        => $product->price ?? 0,
                'cost_usd'          => 0,
                'exchange_rate'     => 1,
            ]);
            $count++;
        }
    }
    echo "Created {$count} legacy batches for existing stock.\n";
});
