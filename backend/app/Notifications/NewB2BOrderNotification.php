<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class NewB2BOrderNotification extends Notification
{
    use Queueable;

    public $store_name;
    public $product_name;
    public $quantity;
    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct($store_name, $product_name, $quantity)
    {
        $this->store_name = $store_name;
        $this->product_name = $product_name;
        $this->quantity = $quantity;
        $this->message = "طلب جديد من متجر [{$store_name}]: {$quantity} قطعة من [{$product_name}] 🛒";
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'store_name'   => $this->store_name,
            'product_name' => $this->product_name,
            'quantity'     => $this->quantity,
            'message'      => $this->message,
            'type'         => 'new_b2b_order'
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'store_name'   => $this->store_name,
            'product_name' => $this->product_name,
            'quantity'     => $this->quantity,
            'message'      => $this->message,
            'type'         => 'new_b2b_order'
        ]);
    }
}
