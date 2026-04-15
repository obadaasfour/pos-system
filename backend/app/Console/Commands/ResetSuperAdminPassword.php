<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ResetSuperAdminPassword extends Command
{
    protected $signature = 'reset:super-admin-password';
    protected $description = 'Reset a Super Admin password';

    public function handle()
    {
        $email = $this->ask('Super Admin Email');
        $user = \App\Models\User::where('email', $email)->where('role', 'SUPER_ADMIN')->first();

        if (!$user) {
            $this->error('No Super Admin account found with that email.');
            return 1;
        }

        // 1. Password with validation
        do {
            $password = $this->secret('New Password (min 8 chars)');
            if (strlen($password) < 8) {
                $this->error('Password must be at least 8 characters long.');
                continue;
            }
            
            $confirm = $this->secret('Confirm New Password');
            if ($password !== $confirm) {
                $this->error('Passwords do not match. Please try again.');
                continue;
            }

            break;
        } while (true);

        try {
            $user->password = \Illuminate\Support\Facades\Hash::make($password);
            $user->save();
            $this->info("Password for Super Admin ({$user->email}) has been reset successfully!");
        } catch (\Exception $e) {
            $this->error('Error resetting password: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
