<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Order;
use App\Models\DailyShiftReport;
use Carbon\Carbon;

class CheckShiftTime
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 1. Admins bypass shift checks
        if (!$user || $user->role === 'admin') {
            return $next($request);
        }

        // 2. If no shift is defined, allow (or block? User said "لتحديد دوام كل موظف")
        if (!$user->shift_start || !$user->shift_end) {
            return $next($request);
        }

        $now = Carbon::now();
        $startTime = Carbon::createFromFormat('H:i:s', $user->shift_start);
        $endTime   = Carbon::createFromFormat('H:i:s', $user->shift_end);

        // Handle overnight shifts (e.g., 22:00 to 06:00)
        $isInside = false;
        if ($startTime->lt($endTime)) {
            $isInside = $now->between($startTime, $endTime);
        } else {
            $isInside = $now->gte($startTime) || $now->lte($endTime);
        }

        if (!$isInside) {
            // Shift has expired. Check if we need to auto-close it.
            // We only close if they were recently active (logged in)
            if ($user->last_login_at && (!$user->last_logout_at || Carbon::parse($user->last_login_at)->gt(Carbon::parse($user->last_logout_at)))) {
                $this->autoCloseShift($user);
            }

            return response()->json([
                'message' => 'انتهى وقت ورديتك أو لم يحن بعد. تم تسجيل الخروج آلياً.',
                'force_logout' => true
            ], 403);
        }

        // Inside shift: update last login if not set for today
        if (!$user->last_login_at || Carbon::parse($user->last_login_at)->lt(Carbon::today())) {
            $user->update(['last_login_at' => $now]);
        }

        return $next($request);
    }

    /**
     * Calculate sales and profits for the shift and archive them.
     */
    private function autoCloseShift($user)
    {
        $lastLogin = Carbon::parse($user->last_login_at);
        $now = Carbon::now();

        // Sales between last login and now
        $orders = Order::where('user_id', $user->id)
            ->whereBetween('created_at', [$lastLogin, $now])
            ->get();

        $totalSales  = $orders->sum('total_amount');
        $totalCost   = $orders->sum('purchase_price');
        $totalProfit = $totalSales - $totalCost;

        DailyShiftReport::create([
            'user_id'      => $user->id,
            'actual_start' => $lastLogin,
            'actual_end'   => $now,
            'total_sales'  => $totalSales,
            'total_profit' => $totalProfit,
            'orders_count' => $orders->count(),
        ]);

        $user->update(['last_logout_at' => $now]);
    }
}
