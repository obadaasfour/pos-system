<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShortageRequest;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SupplierPortalController extends Controller
{
    /**
     * Get all Stores (Tenants) for the supplier to browse.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $stores = \App\Models\Store::withoutGlobalScopes()->get(['id', 'name', 'slug', 'address', 'phone']);
        return response()->json($stores);
    }

    /**
     * Get products of a specific store with STRICT PRIVACY (No prices).
     */
    public function getStoreProducts(Request $request, $storeId)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Fetch products for this store but ONLY non-price fields
        $products = Product::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->with(['category' => function($q) { $q->withoutGlobalScopes(); }])
            ->get(['id', 'name', 'image_path', 'stock_quantity', 'category_id', 'store_id']);

        return response()->json($products);
    }

    /**
     * Get all pending shortages for the authenticated supplier.
     */
    public function getShortages(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $supplierIds = \App\Models\Supplier::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->pluck('id');

        $shortages = ShortageRequest::with([
            'store' => function($q) { $q->withoutGlobalScopes(); },
            'product' => function($q) { $q->withoutGlobalScopes(); }
        ])
            ->whereIn('supplier_id', $supplierIds)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($shortages);
    }

    /**
     * Suggest a new product to the ecosystem.
     */
    public function suggestProduct(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $validated = $request->validate([
                'name'             => 'required|string|max:255',
                'description'      => 'nullable|string',
                'category_id'      => 'nullable|exists:categories,id',
                'image'            => 'nullable|image|max:2048',
                'price_usd'        => 'required|numeric|min:0',
                'target_store_ids' => 'nullable|array',
                'target_store_ids.*' => \Illuminate\Validation\Rule::exists('stores', 'id'),
                'target_all'       => 'nullable'
            ]);

            $supplier = \App\Models\Supplier::withoutGlobalScopes()
                ->where('user_id', $user->id)
                ->first();

            if (!$supplier) {
                return response()->json(['message' => 'لم يتم العثور على ملف مورد لهذا الحساب.'], 404);
            }

            return DB::transaction(function () use ($request, $validated, $supplier) {
                $data = [
                    'supplier_id' => $supplier->id,
                    'name'        => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'category_id' => $validated['category_id'] ?? null,
                    'price_usd'   => $validated['price_usd'],
                    'status'      => 'pending',
                    'target_all'  => filter_var($request->input('target_all'), FILTER_VALIDATE_BOOLEAN),
                ];

                if ($request->hasFile('image')) {
                    $data['image_path'] = $request->file('image')->store('suggestions', 'public');
                }

                $suggestion = \App\Models\ProductSuggestion::create($data);

                $targetStoreIds = [];
                $recipients = collect();

                if (filter_var($request->input('target_all'), FILTER_VALIDATE_BOOLEAN)) {
                    // It's for everyone, notify all store admins
                    $recipients = \App\Models\User::where('role', \App\Models\User::ROLE_ADMIN)
                        ->whereNotNull('store_id')
                        ->get();
                } elseif (!empty($validated['target_store_ids'])) {
                    $suggestion->targetStores()->attach($validated['target_store_ids']);
                    $targetStoreIds = $validated['target_store_ids'];
                    
                    $recipients = \App\Models\User::whereIn('store_id', $targetStoreIds)
                        ->where('role', \App\Models\User::ROLE_ADMIN)
                        ->get();
                }

                // Send Database Notifications
                if ($recipients->count() > 0) {
                    \Illuminate\Support\Facades\Notification::send($recipients, new \App\Notifications\NewProductProposalNotification($suggestion));
                }

                // Broadcast real-time notification
                try {
                    broadcast(new \App\Events\ProductProposalCreated($suggestion, $targetStoreIds))->toOthers();
                } catch (\Exception $e) {
                    Log::error("Proposal Broadcast Error: " . $e->getMessage());
                }

                return response()->json([
                    'message' => 'تم إرسال الاقتراح بنجاح.',
                    'suggestion' => $suggestion->load(['category', 'supplier'])
                ], 201);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'خطأ في التحقق من البيانات', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Product Suggestion Error: " . $e->getMessage());
            return response()->json([
                'message' => 'حدث خطأ أثناء إرسال الاقتراح. يرجى المحاولة لاحقاً.',
                'error_debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get recent purchase invoices created by the supplier.
     */
    public function getPurchases(Request $request)
    {
        $user = $request->user();
        if ($user->role !== \App\Models\User::ROLE_SUPPLIER) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $purchases = \App\Models\Purchase::withoutGlobalScopes()
            ->with([
                'items' => function($q) { $q->withoutGlobalScopes()->with(['product' => function($pq) { $pq->withoutGlobalScopes(); }]); },
                'store' => function($q) { $q->withoutGlobalScopes(); },
                'supplier' => function($q) { $q->withoutGlobalScopes(); }
            ])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json($purchases);
    }
}
