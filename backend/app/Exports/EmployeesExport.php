<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class EmployeesExport implements FromCollection, WithHeadings, WithMapping
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        // Get all users except SUPER_ADMIN and SUPPLIER
        return User::whereNotIn('role', ['SUPER_ADMIN', 'SUPPLIER'])->get();
    }

    public function headings(): array
    {
        return [
            'الاسم',
            'الدور',
            'تاريخ الإنشاء'
        ];
    }

    public function map($employee): array
    {
        $roleName = ($employee->role === 'admin') ? 'مدير' : 'كاشير';
        return [
            $employee->name,
            $roleName,
            $employee->created_at->format('Y-m-d')
        ];
    }
}
