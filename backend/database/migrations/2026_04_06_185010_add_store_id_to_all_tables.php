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

        // Tables that SHOULD allow null store_id (Global tables)
        $globalTables = ['users', 'activity_logs', 'suppliers'];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                // 1. Add column if not exists
                if (!Schema::hasColumn($tableName, 'store_id')) {
                    Schema::table($tableName, function (Blueprint $table) {
                        $table->foreignId('store_id')->nullable()->after('id')->constrained('stores')->onDelete('cascade');
                    });
                }

                // 2. Only enforce non-nullable for non-global tables
                if (!in_array($tableName, $globalTables)) {
                    // We don't update to 1 here anymore because Main Store might not exist
                    // Instead, we leave them nullable if they are empty, 
                    // or the user must handle data integrity during migration.
                    
                    /* 
                    Schema::table($tableName, function (Blueprint $table) {
                        $table->unsignedBigInteger('store_id')->nullable(false)->change();
                    });
                    */
                }
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
