<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Product;
use App\Models\Order;
use App\Models\Customer;
use App\Observers\ProductObserver;
use App\Observers\OrderObserver;
use App\Observers\CustomerObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Product::observe(ProductObserver::class);
        Order::observe(OrderObserver::class);
        Customer::observe(CustomerObserver::class);

        // Register Tenant Policies
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Category::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Product::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Order::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Supplier::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Customer::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Expense::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Employee::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\ProductBatch::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\ActivityLog::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\PaymentLog::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Setting::class, \App\Policies\TenantPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Purchase::class, \App\Policies\TenantPolicy::class);
    }
}
