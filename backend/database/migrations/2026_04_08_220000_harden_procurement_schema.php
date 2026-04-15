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
        // 1. Resolve PostgreSQL ENUM check constraint by converting to string
        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });

        // 2. Add summary metrics to purchases
        Schema::table('purchases', function (Blueprint $table) {
            $table->integer('supplied_quantity')->nullable();
            $table->decimal('unit_price', 15, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['supplied_quantity', 'unit_price']);
        });

        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->enum('status', ['pending', 'ordered', 'resolved'])->default('pending')->change();
        });
    }
};
