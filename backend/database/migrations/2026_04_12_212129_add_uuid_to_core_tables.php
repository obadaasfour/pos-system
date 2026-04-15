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
        $tables = ['products', 'categories', 'product_batches', 'orders', 'customers'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->uuid('uuid')->nullable()->unique()->after('id');
            });

            // Backfill existing records
            DB::table($tableName)->get()->each(function ($record) use ($tableName) {
                DB::table($tableName)->where('id', $record->id)->update([
                    'uuid' => (string) \Illuminate\Support\Str::uuid()
                ]);
            });

            // Make it non-nullable after backfill
            Schema::table($tableName, function (Blueprint $table) {
                $table->uuid('uuid')->nullable(false)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = ['products', 'categories', 'product_batches', 'orders', 'customers'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('uuid');
            });
        }
    }
};
