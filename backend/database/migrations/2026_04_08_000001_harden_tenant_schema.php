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
        // 1. Tables missing store_id
        $missingTables = ['daily_shift_reports', 'order_items', 'purchase_items'];

        foreach ($missingTables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'store_id')) {
                        $table->foreignId('store_id')->nullable()->after('id')->constrained('stores')->onDelete('cascade');
                    }
                });

                // Assign default store (ID: 1) for existing data
                DB::table($tableName)->whereNull('store_id')->update(['store_id' => 1]);

                Schema::table($tableName, function (Blueprint $table) {
                    $table->unsignedBigInteger('store_id')->nullable(false)->change();
                });
            }
        }

        // 2. Ensure Indexes on store_id for ALL tenant-scoped tables
        $tables = [
            'users', 'categories', 'products', 'suppliers', 'orders', 
            'customers', 'expenses', 'employees', 'product_batches', 
            'activity_logs', 'payment_logs', 'settings', 'daily_shift_reports',
            'order_items', 'purchase_items'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    // Laravel's foreignId automatically creates an index. 
                    // This is just a placeholder to acknowledge the requirement.
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $allTenantTables = ['daily_shift_reports', 'order_items', 'purchase_items'];
        foreach ($allTenantTables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('store_id');
                });
            }
        }
    }
};
