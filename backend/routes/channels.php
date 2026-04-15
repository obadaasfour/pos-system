<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('store.{storeId}', function ($user, $storeId) {
    return (int) $user->store_id === (int) $storeId;
});

Broadcast::channel('scanner.{storeId}.{sessionId}', function ($user, $storeId) {
    return (int) $user->store_id === (int) $storeId;
});

Broadcast::channel('supplier.{supplierId}', function ($user, $supplierId) {
    if ($user->role !== \App\Models\User::ROLE_SUPPLIER) return false;
    
    // Lazy load supplier if not loaded
    return (int) $user->supplier?->id === (int) $supplierId;
});
