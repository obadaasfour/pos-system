<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class B2BOrderStatusNotification extends Notification
{
    use Queueable;

    public $order_id;
    public $product_name;
    public $status;
    public $message;
    public $url;

    /**
     * Create a new notification instance.
     */
    public function __construct($order_id, $product_name, $status, $message, $url = '')
    {
        $this->order_id = $order_id;
        $this->product_name = $product_name;
        $this->status = $status;
        $this->message = $message;
        $this->url = $url;
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
            'order_id'     => $this->order_id,
            'product_name' => $this->product_name,
            'status'       => $this->status,
            'message'      => $this->message,
            'url'          => $this->url,
            'type'         => 'b2b_order_status'
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'order_id'     => $this->order_id,
            'product_name' => $this->product_name,
            'status'       => $this->status,
            'message'      => $this->message,
            'url'          => $this->url,
            'type'         => 'b2b_order_status'
        ]);
    }
}
