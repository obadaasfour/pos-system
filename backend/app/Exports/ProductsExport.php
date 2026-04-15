<?php

namespace App\Exports;

use App\Models\ProductBatch;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ProductsExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return ProductBatch::with(['product.category'])
            ->where('remaining_qty', '>', 0)
            ->get();
    }

    public function headings(): array
    {
        return [
            'الاسم',
            'الباركود',
            'السعر (ل.س)',
            'السعر ($)',
            'الكمية',
            'التصنيف',
            'صرف البيع (للدفعة)'
        ];
    }

    public function map($batch): array
    {
        $product = $batch->product;
        if (!$product) return [];

        $price = (float) $batch->sale_price;
        $currency = $batch->price_currency ?: 'SYP';
        $rate = (float) $batch->exchange_rate;
        if ($rate <= 0) $rate = 1;

        // Correct Currency Logic:
        // USD base -> multiply by rate to get SYP
        // SYP base -> divide by rate to get USD
        $priceSyr = ($currency === 'USD') ? (float)($price * $rate) : $price;
        $priceUsd = ($currency === 'USD') ? $price : (float)($price / $rate);

        return [
            $product->name,
            (string) $product->barcode,
            $priceSyr,
            $priceUsd,
            $batch->remaining_qty,
            $product->category ? $product->category->name : 'غير مصنف',
            $rate
        ];
    }

    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT,        // Barcode
            'C' => '#,##0',                          // SYR Price (Thousand separator)
            'D' => '#,##0.00',                       // USD Price (Thousand separator + Decimals)
            'E' => NumberFormat::FORMAT_NUMBER,      // Quantity
            'G' => '#,##0'                           // Exchange Rate
        ];
    }
}
