<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\ProductsExport;
use App\Exports\EmployeesExport;
use App\Exports\SuppliersExport;
use App\Exports\DebtLedgerExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    public function exportProducts($slug)
    {
        return Excel::download(new ProductsExport, 'products.xlsx');
    }

    public function exportEmployees($slug)
    {
        return Excel::download(new EmployeesExport, 'employees.xlsx');
    }

    public function exportSuppliers($slug)
    {
        return Excel::download(new SuppliersExport, 'suppliers.xlsx');
    }

    public function exportDebtLedger($slug)
    {
        return Excel::download(new DebtLedgerExport, 'debt_ledger.xlsx');
    }
}
