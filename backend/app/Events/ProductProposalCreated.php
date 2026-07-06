<?php

namespace App\Events;

use App\Models\ProductSuggestion;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductProposalCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $suggestion;
    public $targetStoreIds;

    public function __construct(ProductSuggestion $suggestion, array $targetStoreIds = [])
    {
        $this->suggestion = $suggestion->load(['supplier', 'category']);
        $this->targetStoreIds = $targetStoreIds;
    }

    public function broadcastOn(): array
    {
        // If targetStoreIds is empty, broadcast to all stores (global channel)
        if (empty($this->targetStoreIds)) {
            return [new Channel('global-proposals')];
        }

        // Otherwise broadcast to specific store channels
        return array_map(function($storeId) {
            return new PrivateChannel('stores.' . $storeId);
        }, $this->targetStoreIds);
    }

    public function broadcastWith(): array
    {
        return [
            'suggestion' => $this->suggestion,
            'message' => 'اقتراح منتج جديد من المورد: ' . ($this->suggestion->supplier->name ?? 'مورد'),
        ];
    }
}
