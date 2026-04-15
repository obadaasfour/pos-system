<?php
$path = 'c:\xampp\htdocs\pos-system\frontend\src\pages\PurchasesPage.jsx';
$content = file_get_contents($path);

// Fix crash
$content = str_replace(
    'setPurchases(purRes.data.data || purRes.data);',
    'const pData = Array.isArray(purRes.data.data) ? purRes.data.data : (Array.isArray(purRes.data) ? purRes.data : []); setPurchases(pData);',
    $content
);

// Add USD support in items map (simplified replacement for now to avoid logic errors)
// We need to add the unit_cost_usd input to the table
$searchFor = '<td className="px-4 py-2">';
$replaceWith = '<td className="px-4 py-2 text-center font-bold text-emerald-600">
                                                            {Number(item.unit_cost_usd || 0).toFixed(2)}$
                                                        </td>
                                                        <td className="px-4 py-2">';

// Only replace once to add the column or handle in loop?
// Better to just fix the crash first, then use multi_replace for UI.

file_put_contents($path, $content);
echo "Fixed PurchasesPage crash.\n";
