<?php

use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\PurchasesController;
use App\Http\Controllers\Api\SuppliersController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ExcelImportController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\PendingOrderController;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\SuperAdminOnly;
use App\Http\Middleware\TenantMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

// ─── Super Admin routes (Global, skip slug) ─────────────────
Route::middleware(['auth:sanctum', SuperAdminOnly::class])->prefix('super-admin')->group(function () {
    Route::get('/stats',            [SuperAdminController::class, 'getStats']);
    Route::get('/stores',           [SuperAdminController::class, 'indexStores']);
    Route::post('/stores',          [SuperAdminController::class, 'storeStore']);
    Route::put('/stores/{id}',      [SuperAdminController::class, 'updateStore']);
    Route::post('/stores/{id}/toggle', [SuperAdminController::class, 'toggleStatus']);
    Route::post('/stores/switch',   [\App\Http\Controllers\StoreController::class, 'switchStore']);
    Route::delete('/stores/{id}',   [SuperAdminController::class, 'destroy']);
    Route::get('/activity-logs',    [ActivityController::class, 'index']);
});

// ─── Public Internal routes (Global login & re-hydration) ───────────────
Route::post('/super-admin/login', [AuthController::class, 'login']);

// ─── Protected Shared routes (Admins, Cashiers, Suppliers) ───────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user()->load(['store', 'supplier']);
    });

    Route::get('/announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index']);

    // Universal Notifications (Database Channel)
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);

    // ─── Global Supplier Portal routes ──────────────────
    Route::middleware('supplier.role')->prefix('supplier')->group(function () {
        Route::get('/shortages', [SupplierPortalController::class, 'getShortages']);
        Route::patch('/shortages/{id}/processing', [SupplierPortalController::class, 'markAsProcessing']);
        Route::patch('/shortages/{id}/supplied', [SupplierPortalController::class, 'markAsSupplied']);
        Route::get('/products',  [SupplierPortalController::class, 'getProducts']);
        Route::post('/products',  [SupplierPortalController::class, 'storeProduct']);
        Route::put('/products/{id}',  [SupplierPortalController::class, 'updateProduct']);
        Route::delete('/products/{id}', [SupplierPortalController::class, 'deleteProduct']);
        Route::get('/purchases', [SupplierPortalController::class, 'getPurchases']);
        
        // B2B Direct Orders Management
        Route::get('/orders', [\App\Http\Controllers\Api\SupplierOrderController::class, 'index']);
        Route::patch('/orders/{id}/status', [\App\Http\Controllers\Api\SupplierOrderController::class, 'updateStatus']);
    });

    // Global Settings access (Exchange Rate, etc.)
    Route::get('/settings', [SettingController::class, 'index']);
});

Route::get('/login-fallback', function () {
    return response()->json(['message' => 'Unauthenticated.', 'force_logout' => true], 401);
})->name('login');

Route::get('/validate-slug/{slug}', function ($slug) {
    $exists = \App\Models\Store::where('slug', $slug)->exists();
    return response()->json(['valid' => $exists]);
});

// ─── Slug-based Store routes ─────────────────────────────
Route::prefix('{slug}')->middleware(TenantMiddleware::class)->group(function () {
    
    // Store Public routes
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/menu',      [\App\Http\Controllers\PublicMenuController::class, 'getMenu']);
    Route::post('/pending-orders', [PendingOrderController::class, 'store']);

    // Store Protected routes
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('/user', function (Request $request) {
            return $request->user()->load(['store', 'supplier']);
        });
        Route::post('/supplier-orders', [\App\Http\Controllers\Api\SupplierOrderController::class, 'store']);
        Route::get('/announcements/latest', [\App\Http\Controllers\Api\AnnouncementController::class, 'latest']);

        // Sales (Cashier + Admin)
        Route::get('/sales/latest', [SalesController::class, 'latestSale']);
        Route::apiResource('sales', SalesController::class);

        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/barcode/{barcode}', [InventoryController::class, 'getByBarcode']);
        Route::post('/remote-scan', [InventoryController::class, 'remoteScan']);
        
        // Pending Orders for POS
        Route::get('/pending-orders', [PendingOrderController::class, 'index']);
        Route::patch('/pending-orders/{id}/status', [PendingOrderController::class, 'updateStatus']);

        // Redundant routes removed and moved to global scope

        // ─── Admin-only routes ────────────────────────
        Route::middleware(AdminOnly::class)->group(function () {
            // Dashboard & Inventory management
            Route::get('/dashboard', [DashboardController::class, 'index']);
            Route::patch('/inventory/{id}', [InventoryController::class, 'update']);
            Route::get('/categories', [CategoryController::class, 'index']);
            Route::post('/products/bulk-link-supplier', [ProductController::class, 'bulkLinkToSupplier']);
            Route::apiResource('products', ProductController::class);

            // Purchases
            Route::get('/purchases',          [PurchasesController::class, 'index']);
            Route::get('/purchases/incoming', [PurchasesController::class, 'incomingIndex']);
            Route::post('/purchases',         [PurchasesController::class, 'store']);
            Route::get('/purchases/{id}',     [PurchasesController::class, 'show']);
            Route::post('/purchases/{id}/confirm', [PurchasesController::class, 'confirmReceipt']);

            // Suppliers
            Route::get('/suppliers',         [SuppliersController::class, 'index']);
            Route::post('/suppliers',        [SuppliersController::class, 'store']);
            Route::put('/suppliers/{id}',    [SuppliersController::class, 'update']);
            Route::delete('/suppliers/{id}', [SuppliersController::class, 'destroy']);

            // Reports
            Route::get('/reports/monthly', [ReportsController::class, 'monthly']);
            Route::get('/reports/pdf-download', [ReportsController::class, 'downloadPDF']);

            // Expenses & Payroll
            Route::get('/employees/{id}/salary-details', [EmployeeController::class, 'getSalaryDetails']);
            Route::apiResource('employees', EmployeeController::class);
            Route::apiResource('expenses', ExpenseController::class);
    
            // Customers & Debts
            Route::get('/customers/{id}/payments', [CustomerController::class, 'paymentHistory']);
            Route::apiResource('customers', CustomerController::class);
            Route::post('/customers/{id}/settle', [CustomerController::class, 'settle']);

            // Backup
            Route::get('/backup', [BackupController::class, 'download']);

            // Activity Logs
            Route::get('/activity-logs', [ActivityController::class, 'index']);

            // Excel/CSV Import
            Route::post('/import/products',  [ExcelImportController::class, 'importProducts']);
            Route::post('/import/users',     [ExcelImportController::class, 'importUsers']);
            Route::post('/import/suppliers', [ExcelImportController::class, 'importSuppliers']);
            Route::post('/import/customers', [ExcelImportController::class, 'importCustomers']);

            // Data Export (Excel) - Support window.open via query token
            Route::prefix('export')->middleware('query.token')->group(function () {
                Route::get('/products',  [ExportController::class, 'exportProducts']);
                Route::get('/employees', [ExportController::class, 'exportEmployees']);
                Route::get('/suppliers', [ExportController::class, 'exportSuppliers']);
                Route::get('/debts',     [ExportController::class, 'exportDebtLedger']);
            });

            // Settings & Configuration
            Route::prefix('settings')->group(function () {
                Route::get('/', [SettingController::class, 'index']);
                Route::post('/', [SettingController::class, 'update']);
                Route::get('/server-ip', [SettingController::class, 'getServerIp']);
                Route::post('/update-exchange', [SettingController::class, 'updateExchangeRate']);
                Route::post('/exchange-rate', [SettingController::class, 'updateExchangeRate']);
            });

            // User Management
            Route::post('/users',               [UserController::class, 'store']);
            Route::get('/users',                [UserController::class, 'index']);
            Route::put('/users/{id}',           [UserController::class, 'update']);
            Route::delete('/users/{id}',        [UserController::class, 'destroy']);
            Route::post('/users/{id}/restore',  [UserController::class, 'restore']);
        });
    });
});
