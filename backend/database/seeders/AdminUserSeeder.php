<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        User::updateOrCreate(
            ['email' => 'admin@pos.com'],
            [
                'name'     => 'مدير النظام',
                'email'    => 'admin@pos.com',
                'password' => Hash::make('password'),
                'role'     => 'admin',
            ]
        );

        // Cashier
        User::updateOrCreate(
            ['email' => 'cashier@example.com'],
            [
                'name'     => 'أحمد الكاشير',
                'email'    => 'cashier@example.com',
                'password' => Hash::make('password'),
                'role'     => 'cashier',
            ]
        );

        $this->command->info('✅ تم إنشاء مستخدم Admin وCashier بنجاح.');
        $this->command->info('   Admin   → admin@pos.com / password');
        $this->command->info('   Cashier → cashier@example.com / password');
    }
}
