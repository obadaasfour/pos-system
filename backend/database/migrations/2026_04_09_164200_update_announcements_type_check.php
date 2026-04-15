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
        DB::statement('ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_type_check');
        DB::statement("ALTER TABLE announcements ADD CONSTRAINT announcements_type_check 
            CHECK (type IN ('info', 'warning', 'urgent', 'new_product'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_type_check');
        DB::statement("ALTER TABLE announcements ADD CONSTRAINT announcements_type_check 
            CHECK (type IN ('info', 'warning', 'urgent'))");
    }
};
