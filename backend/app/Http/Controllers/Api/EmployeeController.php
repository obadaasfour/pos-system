<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index()
    {
        return \App\Models\Employee::all();
    }
 
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'base_salary' => 'required|numeric|min:0',
            'position'    => 'nullable|string|max:255',
        ]);
 
        $employee = \App\Models\Employee::create($validated);
        return response()->json($employee, 201);
    }
 
    public function update(Request $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'base_salary' => 'required|numeric|min:0',
            'position'    => 'nullable|string|max:255',
        ]);
 
        $employee->update($validated);
        return response()->json($employee);
    }
 
    public function destroy($id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $employee->delete();
        return response()->json(['message' => 'تم حذف الموظف بنجاح.']);
    }
 
    /**
     * الحصول على تفاصيل الراتب لهذا الشهر
     */
    public function getSalaryDetails(Request $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $month = $request->query('month', date('Y-m'));
        
        $expenses = \App\Models\Expense::where('employee_id', $id)
            ->where('date', 'like', $month . '%')
            ->get();
            
        $advances  = $expenses->where('category', 'advance')->sum('amount');
        $penalties = $expenses->where('category', 'penalty')->sum('amount');
        $bonuses   = $expenses->where('category', 'bonus')->sum('amount');
        
        $netSalary = $employee->base_salary - $advances - $penalties + $bonuses;
        
        return response()->json([
            'employee'    => $employee,
            'month'       => $month,
            'base_salary' => (float)$employee->base_salary,
            'advances'    => (float)$advances,
            'penalties'   => (float)$penalties,
            'bonuses'     => (float)$bonuses,
            'net_salary'  => (float)$netSalary,
            'history'     => $expenses
        ]);
    }
}
