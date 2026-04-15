<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Setting;
use App\Models\ProductBatch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $timezone = 'Asia/Damascus';
        
        // 1. Parse Dates (Default: Last 7 Days)
        $to = $request->to ? Carbon::parse($request->to, $timezone)->endOfDay() : Carbon::now($timezone)->endOfDay();
        $from = $request->from ? Carbon::parse($request->from, $timezone)->startOfDay() : $to->copy()->subDays(6)->startOfDay();

        $daysCount = $from->diffInDays($to) + 1;

        // 2. Previous Period (for Comparison)
        $prevTo = $from->copy()->subSecond();
        $prevFrom = $prevTo->copy()->subDays($daysCount - 1)->startOfDay();

        // 3. Helper for Stats
        $getStats = function ($start, $end) {
            $sales = Order::whereBetween('created_at', [$start, $end])->sum('total_amount');
            $purchases = Purchase::whereBetween('created_at', [$start, $end])->sum('total_amount');
            $expenses = \App\Models\Expense::whereBetween('date', [$start->toDateString(), $end->toDateString()])->sum('amount');
            
            $grossProfit = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
                ->whereBetween('orders.created_at', [$start, $end])
                ->select(DB::raw('SUM((unit_price - unit_cost_price) * quantity) as profit'))
                ->first()->profit ?? 0;

            return [
                'sales'        => (float)$sales,
                'purchases'    => (float)$purchases,
                'expenses'     => (float)$expenses,
                'gross_profit' => (float)$grossProfit,
                'net_profit'   => (float)($grossProfit - $expenses)
            ];
        };

        $currentStats  = $getStats($from, $to);
        $previousStats = $getStats($prevFrom, $prevTo);

        // 4. Calculate Growth
        $calculateGrowth = function ($current, $previous) {
            if ($previous == 0) return $current > 0 ? 100 : 0;
            return round((($current - $previous) / $previous) * 100, 1);
        };

        $growth = [
            'sales'        => $calculateGrowth($currentStats['sales'],       $previousStats['sales']),
            'gross_profit' => $calculateGrowth($currentStats['gross_profit'], $previousStats['gross_profit']),
            'net_profit'   => $calculateGrowth($currentStats['net_profit'],   $previousStats['net_profit']),
        ];

        // 5. Existing static stats (not period bound)
        $cashBalance = Setting::getCashBalance();
        
        // Locked Capital: Sum of (remaining_qty * cost_local) from all batches
        $lockedCapital = ProductBatch::where('remaining_qty', '>', 0)
            ->select(DB::raw('SUM(remaining_qty * cost_local) as total'))
            ->first()->total ?? 0;

        $lowStockProducts = Product::whereRaw('stock_quantity <= min_quantity')->get();
        $lowStockCount    = $lowStockProducts->count();

        // 6. Top Products in current period
        $topProducts = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
            ->whereBetween('orders.created_at', [$from, $to])
            ->select('products.name', DB::raw('SUM(order_items.quantity) as total_quantity'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get();

        // 7. Sales history - PostgreSQL-compatible date formatting
        $salesHistory = [];
        if ($daysCount <= 31) {
            // Group by Day
            for ($i = 0; $i < $daysCount; $i++) {
                $date  = $from->copy()->addDays($i);
                $total = Order::whereDate('created_at', $date)->sum('total_amount');
                $salesHistory[] = [
                    'label' => $date->format('m-d'),
                    'day'   => $date->translatedFormat('D'),
                    'total' => (float)$total
                ];
            }
        } else {
            // PostgreSQL-compatible grouping (TO_CHAR instead of DATE_FORMAT)
            if ($daysCount <= 90) {
                // Group by ISO week (YYYY-WW)
                $historyData = Order::whereBetween('created_at', [$from, $to])
                    ->select(
                        DB::raw("TO_CHAR(created_at, 'IYYY-IW') as period"),
                        DB::raw('SUM(total_amount) as total'),
                        DB::raw('MIN(created_at) as first_date')
                    )
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get();

                foreach ($historyData as $item) {
                    $pDate = Carbon::parse($item->first_date);
                    $salesHistory[] = [
                        'label' => 'أسبوع ' . $pDate->format('W'),
                        'day'   => $pDate->format('Y-m-d'),
                        'total' => (float)$item->total
                    ];
                }
            } else {
                // Group by Month (YYYY-MM)
                $historyData = Order::whereBetween('created_at', [$from, $to])
                    ->select(
                        DB::raw("TO_CHAR(created_at, 'YYYY-MM') as period"),
                        DB::raw('SUM(total_amount) as total'),
                        DB::raw('MIN(created_at) as first_date')
                    )
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get();

                foreach ($historyData as $item) {
                    $pDate = Carbon::parse($item->first_date);
                    $salesHistory[] = [
                        'label' => $pDate->translatedFormat('M'),
                        'day'   => $pDate->format('Y-m-d'),
                        'total' => (float)$item->total
                    ];
                }
            }
        }

        // 8. All-time Strategic Analytics (No date bounds)
        $allTimeTopVolume = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
            ->select('products.name', DB::raw('SUM(order_items.quantity) as total_quantity'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_quantity')
            ->limit(10)
            ->get();

        $allTimeTopProfit = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.store_id', auth()->user()->store_id) // Hard Isolation
            ->select(
                'products.name', 
                DB::raw('SUM((unit_price - unit_cost_price) * quantity) as total_profit')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_profit')
            ->limit(10)
            ->get();

        return response()->json([
            'period' => [
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(),
                'days' => $daysCount
            ],
            'stats' => [
                'cash_balance'       => (float)$cashBalance,
                'today_sales'        => $currentStats['sales'],
                'today_gross_profit' => $currentStats['gross_profit'],
                'today_expenses'     => $currentStats['expenses'],
                'today_net_profit'   => $currentStats['net_profit'],
                'low_stock_count'    => $lowStockCount,
                'locked_capital'     => (float)$lockedCapital,
                'growth'             => $growth
            ],
            'shift_reports'       => [], // Removed — system uses time-based reports
            'low_stock_products'  => $lowStockProducts,
            'top_products'        => $topProducts,
            'sales_history'       => $salesHistory,
            'all_time_top_volume' => $allTimeTopVolume,
            'all_time_top_profit' => $allTimeTopProfit
        ]);
    }
}
