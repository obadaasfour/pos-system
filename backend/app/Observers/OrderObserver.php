<?php

namespace App\Observers;

use App\Models\Order;
use App\Models\ActivityLog;

class OrderObserver
{
    public function deleted(Order $order): void
    {
        ActivityLog::log(
            'delete',
            "حذف فاتورة مبيعات رقم: #{$order->id}",
            ['total_amount' => $order->total_amount, 'customer_id' => $order->customer_id],
            null
        );
    }
}
