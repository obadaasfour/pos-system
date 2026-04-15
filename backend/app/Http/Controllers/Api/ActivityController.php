<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        // 1. الاستعلام الأساسي
        $query = ActivityLog::with('user')->latest();

        // 2. القفل الأمني الآمن والمضاد للـ Null: إخفاء السوبر أدمن مع ضمان ظهور سجلات النظام
        if (auth()->check() && !auth()->user()->isSuperAdmin()) {
            
            // جلب معرّفات السوبر أدمن عبر الـ Constant لضمان الدقة
            $superAdminIds = \App\Models\User::withoutGlobalScopes()
                ->where('role', \App\Models\User::ROLE_SUPER_ADMIN) 
                ->pluck('id');

            // 1. فلترة الـ ID (السماح للـ Null بالمرور)
            $query->where(function($q) use ($superAdminIds) {
                $q->whereNotIn('user_id', $superAdminIds)
                  ->orWhereNull('user_id');
            });

            // 2. فلترة نوع العملية (السماح للـ Null بالمرور)
            $query->where(function($q) {
                $q->where('action_type', '!=', 'SUPER_ADMIN_ENTRY')
                  ->orWhereNull('action_type');
            });

            // 3. فلترة اسم المستخدم (السماح للـ Null بالمرور باستخدام مصفوفة للسهولة)
            $query->where(function($q) {
                $q->whereNotIn('user_name', ['Super Admin', 'السوبر أدمن', 'super_admin'])
                  ->orWhereNull('user_name');
            });
        }

        // 3. فلتر البحث
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('action_type', 'like', "%{$search}%");
            });
        }

        // 4. فلتر نوع العملية (لن يتم تنفيذه إذا كانت القيمة all)
        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('action_type', $request->type);
        }

        return $query->paginate(30);
    }
}