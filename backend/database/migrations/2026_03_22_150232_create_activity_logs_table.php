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
        Schema::create('activity_logs', function (Blueprint $user) {
            $user->id();
            $user->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $user->string('user_name')->nullable();
            $user->string('action_type'); // add, edit, delete, login, logout, etc.
            $user->text('description')->nullable();
            $user->json('old_values')->nullable();
            $user->json('new_values')->nullable();
            $user->string('ip_address')->nullable();
            $user->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
