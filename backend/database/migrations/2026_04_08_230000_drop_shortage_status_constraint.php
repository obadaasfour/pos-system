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
        // PostgreSQL specific: Drop the check constraint that Laravel creates for ENUM types
        // This is necessary because ->change() to string doesn't always drop the constraint on PGSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE shortage_requests DROP CONSTRAINT IF EXISTS shortage_requests_status_check');
        }

        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->enum('status', ['pending', 'ordered', 'resolved'])->default('pending')->change();
        });
    }
};
