<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BarcodeScannedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $barcode;
    public $sessionId;
    public $storeId;

    /**
     * Create a new event instance.
     */
    public function __construct($storeId, $sessionId, $barcode)
    {
        $this->storeId = $storeId;
        $this->sessionId = $sessionId;
        $this->barcode = $barcode;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("scanner.{$this->storeId}.{$this->sessionId}"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs()
    {
        return 'BarcodeScanned';
    }
}
