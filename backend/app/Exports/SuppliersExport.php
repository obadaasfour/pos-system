<?php

namespace App\Exports;

use App\Models\Supplier;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class SuppliersExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Supplier::withCount('products')->get();
    }

    public function headings(): array
    {
        return [
            'الاسم',
            'الهاتف',
            'عدد المنتجات المرتبطة'
        ];
    }

    public function map($supplier): array
    {
        return [
            $supplier->name,
            $supplier->phone ?: '--',
            $supplier->products_count
        ];
    }
}
