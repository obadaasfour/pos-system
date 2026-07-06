<?php

use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting cleanup...\n";

// 1. Find the Main Store
$mainStore = Store::where('slug', 'main-store')->first();

if ($mainStore) {
    echo "Found Main Store (ID: {$mainStore->id}). Decoupling users...\n";
    
    // 2. Decouple Super Admins from this store
    User::where('role', 'SUPER_ADMIN')->update(['store_id' => null]);
    
    // 3. Delete the store (Cascade handles the rest)
    $mainStore->delete();
    echo "Main Store deleted successfully.\n";
} else {
    echo "Main Store not found. Skipping deletion.\n";
    // Ensure Super Admins are decoupled anyway
    User::where('role', 'SUPER_ADMIN')->update(['store_id' => null]);
}

echo "Cleanup complete.\n";
