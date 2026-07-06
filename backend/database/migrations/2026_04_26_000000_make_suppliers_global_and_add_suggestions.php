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
        // 1. Make store_id nullable in suppliers (to make them global)
        Schema::table('suppliers', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable()->change();
        });

        // 2. Create product_suggestions table
        Schema::create('product_suggestions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supplier_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_suggestions');

        Schema::table('suppliers', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable(false)->change();
        });
    }
};
