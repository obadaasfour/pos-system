<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Get the latest active announcement for the user's store or global.
     */
    public function latest(Request $request)
    {
        $storeId = $request->user()->store_id;

        $announcement = Announcement::where('is_active', true)
            ->where(function($q) use ($storeId) {
                $q->whereNull('store_id')
                  ->orWhere('store_id', $storeId);
            })
            ->latest()
            ->first();

        if (!$announcement) {
            return response()->json(['message' => null]);
        }

        return response()->json([
            'message' => $announcement->content,
            'title'   => $announcement->title,
            'type'    => $announcement->type
        ]);
    }
}
