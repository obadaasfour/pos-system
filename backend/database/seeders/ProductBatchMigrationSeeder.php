<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductBatch;

class ProductBatchMigrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $products = Product::where('stock_quantity', '>', 0)->get();

        foreach ($products as $product) {
            // Only create if no batches exist
            if ($product->batches()->count() === 0) {
                ProductBatch::create([
                    'product_id'        => $product->id,
                    'purchase_id'       => null,
                    'original_quantity' => $product->stock_quantity,
                    'remaining_qty'     => $product->stock_quantity,
                    'cost_usd'          => 0, // Legacy stock cost in USD is unknown
                    'exchange_rate'     => 1,
                    'cost_local'        => $product->cost_price ?? 0,
                ]);
            }
        }
    }
}
