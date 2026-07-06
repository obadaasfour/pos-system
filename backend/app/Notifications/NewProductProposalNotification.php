<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Broadcasting\PrivateChannel;

class NewProductProposalNotification extends Notification
{
    use Queueable;

    protected $suggestion;

    /**
     * Create a new notification instance.
     */
    public function __construct($suggestion)
    {
        $this->suggestion = $suggestion;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Determine the broadcast channel for the notification.
     */
    public function broadcastOn(object $notifiable): array
    {
        // Broadcast to the store's shared channel instead of individual user channel
        if (isset($notifiable->store_id)) {
            return [
                new PrivateChannel('stores.' . $notifiable->store_id),
            ];
        }
        return [];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'b2b_proposal',
            'suggestion_id' => $this->suggestion->id,
            'message' => "اقتراح منتج جديد: {$this->suggestion->name}",
            'supplier_name' => $this->suggestion->supplier->name ?? 'مورد',
            'price_usd' => $this->suggestion->price_usd,
            'image_path' => $this->suggestion->image_path,
            'url' => '/dashboard', // Can point to where they see proposals
        ];
    }
}
