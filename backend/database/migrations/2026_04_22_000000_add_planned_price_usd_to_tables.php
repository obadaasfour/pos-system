<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'planned_price_usd')) {
            Schema::table('products', function (Blueprint $table) {
                $table->decimal('planned_price_usd', 15, 2)->nullable()->after('price_usd');
            });
        }

        if (!Schema::hasColumn('product_batches', 'planned_price_usd')) {
            Schema::table('product_batches', function (Blueprint $table) {
                $table->decimal('planned_price_usd', 15, 2)->nullable()->after('sale_price');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('planned_price_usd');
        });

        Schema::table('product_batches', function (Blueprint $table) {
            $table->dropColumn('planned_price_usd');
        });
    }
};
