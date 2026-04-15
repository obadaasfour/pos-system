<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'Cash POS API is running',
        'version' => '1.0'
    ]);
});
