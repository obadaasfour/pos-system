<?php
$path = 'c:\xampp\htdocs\pos-system\frontend\src\pages\PurchasesPage.jsx';
$content = file_get_contents($path);

// 1. Update form state to include exchange_rate and unit_cost_usd
$content = str_replace(
    'items: [{ product_id: \'\', name: \'\', quantity: 1, unit_cost_price: \'\' }],',
    'exchange_rate: \'\', items: [{ product_id: \'\', name: \'\', quantity: 1, unit_cost_price: \'\', unit_cost_usd: \'\' }],',
    $content
);

// 2. Update updateItem logic for auto-calculation
$oldLogic = 'const newItems = [...f.items];
        newItems[i] = { ...newItems[i], [field]: val };
        return { ...f, items: newItems };';
$newLogic = 'const newItems = [...f.items];
        newItems[i] = { ...newItems[i], [field]: val };
        if (field === \'unit_cost_usd\') {
            const usd = parseFloat(val) || 0;
            const rate = parseFloat(f.exchange_rate) || 0;
            newItems[i].unit_cost_price = (usd * rate).toFixed(0);
        }
        return { ...f, items: newItems };';
$content = str_replace($oldLogic, $newLogic, $content);

// 3. Add Exchange Rate field to form header
$headerSearch = '<div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">ملاحظات</label>';
$headerReplace = '<div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">سعر الصرف (1$ = ل.س)</label>
                                    <input type="number" required value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))}
                                        placeholder="14000"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-black text-emerald-600 focus:ring-2 focus:ring-blue-400 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">ملاحظات</label>';
$content = str_replace($headerSearch, $headerReplace, $content);

// 4. Add USD cost column and auto-calculation logic to table
$tableHeaderSearch = '<th className="px-4 py-3 text-center w-36">التكلفة</th>';
$tableHeaderReplace = '<th className="px-4 py-3 text-center w-32">التكلفة ($)</th><th className="px-4 py-3 text-center w-36">التكلفة (ل.س)</th>';
$content = str_replace($tableHeaderSearch, $tableHeaderReplace, $content);

$itemRowSearch = '<td className="px-4 py-2">
                                                            <input type="number" min="0" required value={item.unit_cost_price} onChange={e => updateItem(idx, \'unit_cost_price\', e.target.value)}
                                                                className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none" />
                                                        </td>
                                                        <td className="px-4 py-2 text-center font-bold text-slate-700">
                                                            {formatPrice(line)}
                                                        </td>';
$itemRowReplace = '<td className="px-4 py-2">
                                                            <input type="number" min="0" step="0.01" required value={item.unit_cost_usd} onChange={e => updateItem(idx, \'unit_cost_usd\', e.target.value)}
                                                                placeholder="0.00"
                                                                className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-blue-400 outline-none" />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input type="number" min="0" required value={item.unit_cost_price} onChange={e => updateItem(idx, \'unit_cost_price\', e.target.value)}
                                                                className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none" />
                                                        </td>
                                                        <td className="px-4 py-2 text-center font-bold text-slate-700">
                                                            {formatPrice(line)}
                                                        </td>';
$content = str_replace($itemRowSearch, $itemRowReplace, $content);

file_put_contents($path, $content);
echo "Updated Purchases UI for Multi-Currency.\n";
