<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CreateSuperAdmin extends Command
{
    protected $signature = 'make:super-admin';
    protected $description = 'Create a new Super Admin account';

    public function handle()
    {
        $this->info('Starting Super Admin account creation...');

        // 1. Existence check
        if (\App\Models\User::where('role', 'SUPER_ADMIN')->exists()) {
            $this->error('A Super Admin account already exists. Use "php artisan reset:super-admin-password" instead.');
            return 1;
        }

        $name = $this->ask('Name');
        $email = $this->ask('Email');

        // 2. Password with validation
        do {
            $password = $this->secret('Password (min 8 chars)');
            if (strlen($password) < 8) {
                $this->error('Password must be at least 8 characters long.');
                continue;
            }
            
            $confirm = $this->secret('Confirm Password');
            if ($password !== $confirm) {
                $this->error('Passwords do not match. Please try again.');
                continue;
            }

            break;
        } while (true);

        // 3. Create user
        try {
            $user = \App\Models\User::create([
                'name' => $name,
                'email' => $email,
                'password' => \Illuminate\Support\Facades\Hash::make($password),
                'role' => 'SUPER_ADMIN',
                'store_id' => null,
            ]);

            $this->info("Super Admin account created successfully! ({$user->email})");
        } catch (\Exception $e) {
            $this->error('Error creating Super Admin: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
