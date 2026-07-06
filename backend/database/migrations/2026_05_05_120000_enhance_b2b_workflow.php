<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add price_usd to product_suggestions
        Schema::table('product_suggestions', function (Blueprint $table) {
            $table->decimal('price_usd', 12, 2)->after('category_id')->nullable();
        });

        // Create pivot table for targeting specific stores
        Schema::create('product_suggestion_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_suggestion_id');
            $table->unsignedBigInteger('store_id');
            $table->timestamps();

            $table->foreign('product_suggestion_id', 'ps_targets_suggestion_id_foreign')
                  ->references('id')->on('product_suggestions')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
        });

        // Add shipping status fields to supplier_orders
        Schema::table('supplier_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('suggestion_id')->nullable()->after('product_id');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->string('tracking_number')->nullable();

            $table->foreign('suggestion_id')->references('id')->on('product_suggestions')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_orders', function (Blueprint $table) {
            $table->dropColumn(['shipped_at', 'received_at', 'tracking_number']);
        });

        Schema::dropIfExists('product_suggestion_targets');

        Schema::table('product_suggestions', function (Blueprint $table) {
            $table->dropColumn('price_usd');
        });
    }
};
