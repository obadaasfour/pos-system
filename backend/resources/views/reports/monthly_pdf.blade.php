<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Monthly Report</h1>
        <p>{{ $month }}</p>
    </div>

    <div>
        <p>Total Sales: {{ number_format($total_sales) }}</p>
        <p>Total Profit: {{ number_format($total_profit) }}</p>
        <p>Total Expenses: {{ number_format($total_expenses) }}</p>
    </div>

    <h3>Top Products</h3>
    <table>
        <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Profit</th>
        </tr>
        @foreach($top_profitable as $product)
        <tr>
            <td>{{ $product->name }}</td>
            <td>{{ $product->total_quantity }}</td>
            <td>{{ number_format($product->total_profit) }}</td>
        </tr>
        @endforeach
    </table>
</body>
</html>
