<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PurchaseItem;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

echo "--- Emergency Image Fix: Pear (اجاص) --- \n";

// 1. Find the Local Product 'اجاص'
$localProduct = Product::withoutGlobalScopes()
    ->where('name', 'like', '%اجاص%')
    ->where('store_id', '!=', 1) // Assuming store 1 is global/supplier
    ->first();

if (!$localProduct) {
    // Try finding any 'اجاص' if store logic is different
    $localProduct = Product::withoutGlobalScopes()->where('name', 'like', '%اجاص%')->orderBy('id', 'desc')->first();
}

if (!$localProduct) {
    die("Error: Local product 'اجاص' not found in database.\n");
}

echo "Found Local Product: {$localProduct->name} (ID: {$localProduct->id}) \n";

// 2. Find the Purchase Item that created/updated this product (likely latest)
$item = PurchaseItem::withoutGlobalScopes()
    ->where('product_id', $localProduct->id)
    ->orderBy('id', 'desc')
    ->first();

// If not items linked yet (maybe they were linked to supplier product first)
if (!$item) {
     // Search items linked to invoice 22
     $item = PurchaseItem::withoutGlobalScopes()->where('purchase_id', 22)->first();
}

if (!$item) {
    die("Error: Purchase item not found. \n");
}

echo "Found Purchase Item #{$item->id} from Purchase #{$item->purchase_id} \n";

// 3. Find the ORIGINAL Supplier Product
// If the product_id in the item is the local one, we need to check if there's a link or if we can find the supplier product by name
$supplierProduct = Product::withoutGlobalScopes()
    ->where('name', 'like', '%اجاص%')
    ->where('store_id', 1) // Assuming 1 is supplier store
    ->first();

if (!$supplierProduct) {
    // Search the product linked to the item if it differs
    // In our logic, SupplierPortalController used the supplier's product_id
    // But confirmReceipt updated it to the local product_id.
    // So we might need to look at common data.
    echo "Warning: Supplier product with store_id=1 not found. Attempting alternative search... \n";
    $supplierProduct = Product::withoutGlobalScopes()
        ->where('name', 'like', '%اجاص%')
        ->where('id', '!=', $localProduct->id)
        ->first();
}

if (!$supplierProduct || !$supplierProduct->image_path) {
    die("Error: Supplier product or image path not found. \n");
}

$oldPath = $supplierProduct->image_path;
echo "Supplier Image Path: {$oldPath} \n";

// 4. Perform the Copy
if (Storage::disk('public')->exists($oldPath)) {
    $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
    $newPath = 'products/' . Str::uuid() . '.' . $extension;
    
    if (Storage::disk('public')->copy($oldPath, $newPath)) {
        echo "Successfully copied image to: {$newPath} \n";
        
        // 5. Update Local Product
        $localProduct->update(['image_path' => $newPath]);
        echo "Local product image updated successfully. \n";
    } else {
        echo "Error: Failed to copy image file. \n";
    }
} else {
    echo "Error: Source image does not exist on disk at {$oldPath}. \n";
}

// 6. Run Storage Link
echo "Running storage:link... \n";
exec('php artisan storage:link');
echo "Done. \n";
