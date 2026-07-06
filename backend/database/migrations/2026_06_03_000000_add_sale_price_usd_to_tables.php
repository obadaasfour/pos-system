<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'sale_price_usd')) {
            Schema::table('products', function (Blueprint $table) {
                $table->decimal('sale_price_usd', 15, 2)->nullable()->after('planned_price_usd');
            });
        }

        if (!Schema::hasColumn('product_batches', 'sale_price_usd')) {
            Schema::table('product_batches', function (Blueprint $table) {
                $table->decimal('sale_price_usd', 15, 2)->nullable()->after('planned_price_usd');
            });
        }

        // Copy existing data
        DB::table('products')->update([
            'sale_price_usd' => DB::raw('COALESCE(planned_price_usd, price_usd, 0)')
        ]);

        DB::table('product_batches')->update([
            'sale_price_usd' => DB::raw('COALESCE(planned_price_usd, 0)')
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sale_price_usd');
        });

        Schema::table('product_batches', function (Blueprint $table) {
            $table->dropColumn('sale_price_usd');
        });
    }
};
