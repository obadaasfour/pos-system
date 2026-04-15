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
        // 1. Add status to purchases
        Schema::table('purchases', function (Blueprint $table) {
            $table->enum('status', ['received', 'pending_confirmation'])->default('received')->after('notes');
        });

        // 2. Update status in shortage_requests (Using raw SQL if enum update is tricky in Laravel)
        // For simplicity in SQLite/MySQL, we recreate or append.
        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->string('status')->default('pending')->change(); // Relax enum to string for flexibility
        });

        // 3. Announcements table
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->nullable(); // null = global
            $table->string('title');
            $table->text('content');
            $table->enum('type', ['info', 'warning', 'urgent'])->default('info');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcements');

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('shortage_requests', function (Blueprint $table) {
            $table->enum('status', ['pending', 'ordered', 'resolved'])->default('pending')->change();
        });
    }
};
