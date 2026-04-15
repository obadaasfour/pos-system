<?php

namespace App\Events;

use App\Models\Product;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $storeId;

    public function __construct($storeId)
    {
        $this->storeId = $storeId;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('store.' . $this->storeId),
        ];
    }

    public function broadcastAs()
    {
        return 'inventory.updated';
    }
}
