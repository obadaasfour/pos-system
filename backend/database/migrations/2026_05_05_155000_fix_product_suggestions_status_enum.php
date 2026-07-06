<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For PostgreSQL, we need to handle the check constraint
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE product_suggestions DROP CONSTRAINT IF EXISTS product_suggestions_status_check");
            DB::statement("ALTER TABLE product_suggestions ADD CONSTRAINT product_suggestions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'ordered'))");
        } else {
            Schema::table('product_suggestions', function (Blueprint $table) {
                $table->string('status')->default('pending')->change();
            });
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE product_suggestions DROP CONSTRAINT IF EXISTS product_suggestions_status_check");
            DB::statement("ALTER TABLE product_suggestions ADD CONSTRAINT product_suggestions_status_check CHECK (status IN ('pending', 'approved', 'rejected'))");
        }
    }
};
