<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all public settings.
     */
    public function index()
    {
        return response()->json([
            'exchange_rate' => Setting::get('exchange_rate', 1),
            'currency_symbol' => Setting::get('currency_symbol', 'ل.س'),
            'pos_theme' => Setting::get('pos_theme', 'light'),
        ]);
    }

    /**
     * Update a specific setting.
     */
    public function update(Request $request)
    {
        $request->validate([
            'key'   => 'required|string',
            'value' => 'required',
        ]);

        Setting::set($request->key, $request->value);

        return response()->json([
            'message' => 'تم تحديث الإعدادات بنجاح.',
            'setting' => [
                'key'   => $request->key,
                'value' => $request->value
            ]
        ]);
    }

    /**
     * Specialized update for exchange rate.
     */
    public function updateExchangeRate(Request $request)
    {
        $request->validate([
            'rate' => 'required|numeric|min:1',
        ]);

        Setting::set('exchange_rate', $request->rate);

        return response()->json([
            'message' => 'تم تحديث سعر صرف الدولار بنجاح.',
            'rate'    => $request->rate
        ]);
    }
    public function getServerIp()
    {
        $ip = $_SERVER['SERVER_ADDR'] ?? gethostbyname(gethostname());
        if ($ip == '::1' || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false) {
            $ip = gethostbyname(gethostname());
        }
        return response()->json(['ip' => $ip]);
    }
}
