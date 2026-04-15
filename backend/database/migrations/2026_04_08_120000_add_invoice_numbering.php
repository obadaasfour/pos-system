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
        Schema::table('orders', function (Blueprint $table) {
            $table->bigInteger('invoice_number')->nullable()->after('store_id');
            $table->index(['store_id', 'invoice_number']);
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->bigInteger('invoice_number')->nullable()->after('store_id');
            $table->index(['store_id', 'invoice_number']);
        });

        // Initialize existing records with sequential numbers per store
        $this->initializeInvoiceNumbers('orders');
        $this->initializeInvoiceNumbers('purchases');
    }

    private function initializeInvoiceNumbers(string $tableName): void
    {
        $storeIds = DB::table($tableName)->distinct()->pluck('store_id');

        foreach ($storeIds as $storeId) {
            $records = DB::table($tableName)
                ->where('store_id', $storeId)
                ->orderBy('created_at', 'asc')
                ->get();

            $counter = 1;
            foreach ($records as $record) {
                DB::table($tableName)
                    ->where('id', $record->id)
                    ->update(['invoice_number' => $counter++]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('invoice_number');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn('invoice_number');
        });
    }
};
