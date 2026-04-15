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
        $tables = [
            'users', 
            'categories', 
            'products', 
            'suppliers', 
            'orders', 
            'customers', 
            'expenses', 
            'employees', 
            'product_batches', 
            'activity_logs',
            'payment_logs'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $table->foreignId('store_id')->nullable()->after('id')->constrained('stores')->onDelete('cascade');
                });

                // Assign default store (ID: 1) for existing data
                DB::table($tableName)->update(['store_id' => 1]);

                // Make it non-nullable after filling data
                Schema::table($tableName, function (Blueprint $table) {
                    $table->unsignedBigInteger('store_id')->nullable(false)->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'users', 
            'categories', 
            'products', 
            'suppliers', 
            'orders', 
            'customers', 
            'expenses', 
            'employees', 
            'product_batches', 
            'activity_logs',
            'payment_logs'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('store_id');
                });
            }
        }
    }
};
