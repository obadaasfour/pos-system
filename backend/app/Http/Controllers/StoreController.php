<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function index()
    {
        // Only Super Admins can see all stores
        if (auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json([auth()->user()->store], 200);
        }
        return response()->json(Store::all(), 200);
    }

    public function store(Request $request)
    {
        if (auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:stores,slug',
        ]);

        $store = Store::create($request->all());
        return response()->json($store, 201);
    }

    public function switchStore(Request $request)
    {
        if (auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $store = Store::findOrFail($request->store_id);

        $user = auth()->user();
        $user->store_id = $store->id;
        $user->save();

        return response()->json([
            'message' => 'تم الانتقال إلى المتجر: ' . $store->name,
            'user' => $user->load('store'),
            'slug' => $store->slug
        ]);
    }
}
