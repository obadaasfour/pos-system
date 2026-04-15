<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Customer;
use App\Models\User;
use App\Models\ProductBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ExcelImportController extends Controller
{
    public function importProducts(Request $request) {
        return $this->importCsv($request, function($row) {
            // expected CSV: name, barcode, price, stock, category_id, description
            $product = Product::create([
                'name' => $row[0],
                'barcode' => $row[1] ?: null,
                'price' => (float)$row[2],
                'stock_quantity' => (int)$row[3],
                'category_id' => $row[4] ?: 1,
                'description' => $row[5] ?? '',
            ]);
            // Create initial batch for imported stock
            ProductBatch::create([
                'product_id' => $product->id,
                'original_quantity' => $product->stock_quantity,
                'remaining_qty' => $product->stock_quantity,
                'cost_local' => 0, // Imported via CSV, cost unknown
                'exchange_rate' => 1
            ]);
        });
    }

    public function importSuppliers(Request $request) {
        return $this->importCsv($request, function($row) {
            Supplier::create([
                'name' => $row[0],
                'phone' => $row[1] ?? '',
                'address' => $row[2] ?? '',
                'contact_person' => $row[3] ?? '',
            ]);
        });
    }

    public function importCustomers(Request $request) {
        return $this->importCsv($request, function($row) {
            Customer::create([
                'name' => $row[0],
                'phone' => $row[1] ?? '',
                'total_debt' => (float)($row[2] ?? 0),
            ]);
        });
    }

    public function importUsers(Request $request) {
        return $this->importCsv($request, function($row) {
            User::create([
                'name' => $row[0],
                'email' => $row[1],
                'password' => Hash::make($row[2] ?? 'password123'),
                'role' => $row[3] ?? 'cashier',
                'shift_start' => $row[4] ?? '08:00:00',
                'shift_end' => $row[5] ?? '16:00:00',
            ]);
        });
    }

    private function importCsv(Request $request, $callback) {
        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'لم يتم رفع أي ملف.'], 400);
        }

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle); // Skip header

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) > 0) $callback($row);
            }
            fclose($handle);
            DB::commit();
            return response()->json(['message' => 'تم استيراد البيانات بنجاح.']);
        } catch (\Exception $e) {
            fclose($handle);
            DB::rollBack();
            return response()->json(['message' => 'خطأ أثناء الاستيراد: ' . $e->getMessage()], 500);
        }
    }
}
