<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Expense;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    private function getReportData()
    {
        try {
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth   = Carbon::now()->endOfMonth();
            $daysInMonth  = Carbon::now()->daysInMonth;

            // 1. Line Chart Data: Daily Sales and Profit
            $dailyData = [];
            for ($i = 1; $i <= $daysInMonth; $i++) {
                $date = Carbon::now()->startOfMonth()->addDays($i - 1);
                if ($date->isFuture()) break;

                $sales = Order::whereDate('created_at', $date)->sum('total_amount');
                
                $profit = DB::table('order_items')
                    ->join('orders', 'order_items.order_id', '=', 'orders.id')
                    ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
                    ->whereDate('orders.created_at', $date)
                    ->select(DB::raw('SUM((unit_price - unit_cost_price) * quantity) as profit'))
                    ->first()->profit ?? 0;

                $dailyData[] = [
                    'day'    => $i,
                    'date'   => $date->format('Y-m-d'),
                    'sales'  => (float)$sales,
                    'profit' => (float)$profit,
                ];
            }

            // 2. Most Profitable Products (Top 5)
            $topProfitableProducts = DB::table('order_items')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
                ->whereBetween('orders.created_at', [$startOfMonth, $endOfMonth])
                ->select(
                    'products.name',
                    DB::raw('SUM((order_items.unit_price - order_items.unit_cost_price) * order_items.quantity) as total_profit'),
                    DB::raw('SUM(order_items.quantity) as total_quantity')
                )
                ->groupBy('products.id', 'products.name')
                ->orderByDesc('total_profit')
                ->limit(5)
                ->get();

            // 3. Expenses Summary (using Expense model — transactions table is removed)
            $expensesRaw = Expense::whereBetween('date', [
                    $startOfMonth->toDateString(),
                    $endOfMonth->toDateString()
                ])
                ->select('category', 'amount', 'date', 'notes')
                ->latest('date')
                ->get()
                ->map(fn($e) => [
                    'description' => $e->category . ($e->notes ? " — {$e->notes}" : ''),
                    'amount'      => $e->amount,
                    'created_at'  => $e->date,
                ]);

            $totalExpenses = $expensesRaw->sum('amount');

            $totalProfit = (float) DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
                ->whereBetween('orders.created_at', [$startOfMonth, $endOfMonth])
                ->select(DB::raw('SUM((unit_price - unit_cost_price) * quantity) as profit'))
                ->first()->profit ?? 0;

            return [
                'month'          => Carbon::now()->translatedFormat('F Y'),
                'daily_data'     => $dailyData,
                'top_profitable' => $topProfitableProducts,
                'expenses'       => $expensesRaw,
                'total_expenses' => (float)$totalExpenses,
                'total_sales'    => (float)Order::whereBetween('created_at', [$startOfMonth, $endOfMonth])->sum('total_amount'),
                'total_profit'   => $totalProfit,
            ];
        } catch (\Exception $e) {
            throw new \Exception("Data Gathering Error: " . $e->getMessage());
        }
    }

    public function monthly()
    {
        return response()->json($this->getReportData());
    }

    public function downloadPDF()
    {
        try {
            $data = $this->getReportData();
            $pdf  = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.monthly_pdf', $data);
            return $pdf->download('Monthly_Report_' . date('Y-m') . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'PDF Generation Failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
