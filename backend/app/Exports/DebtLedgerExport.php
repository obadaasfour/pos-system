<?php

namespace App\Exports;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class DebtLedgerExport implements FromCollection, WithHeadings, WithMapping
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        // Debt ledger typically includes credit sales
        return Order::with('customer')
            ->where('payment_method', 'credit')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return [
            'الزبون',
            'المبلغ (ل.س)',
            'المبلغ ($)',
            'التاريخ',
            'الحالة'
        ];
    }

    public function map($order): array
    {
        $statusAr = [
            'pending'   => 'قيد الانتظار',
            'completed' => 'مكتمل',
            'cancelled' => 'ملغي',
            'shipped'   => 'تم الشحن'
        ];

        $rate = (float) \App\Models\Setting::get('exchange_rate', 1);
        $amountUsd = $rate > 0 ? round($order->total_amount / $rate, 2) : 0;

        return [
            $order->customer ? $order->customer->name : 'زبون نقدي',
            $order->total_amount,
            $amountUsd,
            $order->created_at->format('Y-m-d H:i'),
            isset($statusAr[$order->status]) ? $statusAr[$order->status] : $order->status
        ];
    }
}
