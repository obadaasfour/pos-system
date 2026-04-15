<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow; // استخدم ShouldBroadcastNow لتجاوز الطابور
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GlobalNewProductEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $supplier_id;
    public $supplier_name;
    public $supplier_phone;
    public $product_name;
    public $price_usd;
    public $price_syr;
    public $product_id;
    public $image_path;

    public function __construct($supplier_id, $supplier_name, $supplier_phone, $product_name, $price_usd, $price_syr, $product_id, $image_path = null)
    {
        $this->supplier_id = $supplier_id;
        $this->supplier_name = $supplier_name;
        $this->supplier_phone = $supplier_phone;
        $this->product_name = $product_name;
        $this->price_usd = $price_usd;
        $this->price_syr = $price_syr;
        $this->product_id = $product_id;
        $this->image_path = $image_path ? asset(\Storage::url($image_path)) : null;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('global-announcements'),
        ];
    }

    public function broadcastAs()
    {
        return 'product.global_created';
    }
}
