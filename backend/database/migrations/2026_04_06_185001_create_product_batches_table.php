<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('purchase_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('original_quantity');
            $table->integer('remaining_qty');
            $table->decimal('cost_usd', 12, 4)->default(0);
            $table->decimal('exchange_rate', 12, 4)->default(0);
            $table->decimal('cost_local', 12, 2)->default(0);
            $table->timestamps();
        });

        // Add batch_id and specific unit_cost_price to order_items to track FIFO cost accurately
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->constrained('product_batches')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('batch_id');
        });
        Schema::dropIfExists('product_batches');
    }
};
