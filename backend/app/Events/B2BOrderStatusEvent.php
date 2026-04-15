<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class B2BOrderStatusEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order_id;
    public $product_name;
    public $status;
    public $message;
    public $store_id;

    public function __construct($order_id, $product_name, $status, $message, $store_id)
    {
        $this->order_id = $order_id;
        $this->product_name = $product_name;
        $this->status = $status;
        $this->message = $message;
        $this->store_id = $store_id;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('store.' . $this->store_id),
        ];
    }

    public function broadcastAs()
    {
        return 'b2b.order_status_updated';
    }
}
