<?php

namespace App\Observers;

use App\Models\Customer;
use App\Models\ActivityLog;

class CustomerObserver
{
    public function updated(Customer $customer): void
    {
        if ($customer->isDirty('total_debt')) {
            ActivityLog::log(
                'edit',
                "تحديث مديونية العميل: {$customer->name}",
                ['total_debt' => $customer->getOriginal('total_debt')],
                ['total_debt' => $customer->total_debt]
            );
        }
    }
}
