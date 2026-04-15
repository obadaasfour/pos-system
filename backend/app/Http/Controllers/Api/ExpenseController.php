<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        return \App\Models\Expense::with('employee')->latest()->paginate(20);
    }
 
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category'    => 'required|string',
            'amount'      => 'required|numeric|min:0.01',
            'date'        => 'required|date',
            'notes'       => 'nullable|string',
            'employee_id' => 'nullable|exists:employees,id',
        ]);
 
        return \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $request) {
            $data = $validated;
            if (empty($data['employee_id'])) {
                $data['employee_id'] = null;
            }
            $expense = \App\Models\Expense::create($data);
 
            // Update cash balance
            \App\Models\Setting::decrementCashBalance($validated['amount']);
 
            return response()->json($expense, 201);
        });
    }
 
    public function destroy($id)
    {
        $expense = \App\Models\Expense::findOrFail($id);
        
        \Illuminate\Support\Facades\DB::transaction(function () use ($expense) {
            // Reverse cash balance
            \App\Models\Setting::incrementCashBalance($expense->amount);
            $expense->delete();
        });
 
        return response()->json(['message' => 'تم حذف المصروف بنجاح.']);
    }
}
