<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\ActivityLog;

class ProductObserver
{
    public function updated(Product $product): void
    {
        $changes = $product->getChanges();
        $relevantFields = ['price', 'cost_price', 'stock_quantity'];
        
        $oldValues = [];
        $newValues = [];
        $hasSignificantChange = false;

        foreach ($relevantFields as $field) {
            if (array_key_exists($field, $changes)) {
                $oldValues[$field] = $product->getOriginal($field);
                $newValues[$field] = $product->$field;
                $hasSignificantChange = true;
            }
        }

        if ($hasSignificantChange) {
            ActivityLog::log(
                'edit',
                "تعديل بيانات المنتج: {$product->name}",
                $oldValues,
                $newValues
            );
        }
    }
}
