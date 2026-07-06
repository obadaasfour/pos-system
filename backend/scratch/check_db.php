<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "Products Table Columns:\n";
print_r(Schema::getColumnListing('products'));

echo "\nProduct Batches Table Columns:\n";
print_r(Schema::getColumnListing('product_batches'));
