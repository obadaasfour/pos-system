<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds store_id to the settings table so the BelongsToStore
     * global scope does not crash with "Unknown column 'settings.store_id'".
     */
    public function up(): void
    {
        // 1. Drop the old unique key on 'key' alone (we'll add a composite unique instead)
        Schema::table('settings', function (Blueprint $table) {
            // Add store_id as nullable first so existing rows don't fail
            $table->foreignId('store_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('stores')
                  ->onDelete('cascade');
        });

        // 2. Set all existing settings to the default store (ID = 1)
        DB::table('settings')->update(['store_id' => 1]);

        // 3. Make it non-nullable and add a composite unique so each store
        //    can have its own exchange_rate, currency_symbol, etc.
        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable(false)->change();
            // PgSQL: drop old unique index by its generated name
            $table->dropUnique('settings_key_unique');
            $table->unique(['store_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'key']);
            $table->dropConstrainedForeignId('store_id');
            $table->unique('key');
        });
    }
};
