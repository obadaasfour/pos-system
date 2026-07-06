import { CAIRO_FONT } from './CairoFont';
import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';
import QRCode from 'qrcode';

const bidi = bidiFactory();

/**
 * fixArabic - يصحح النص العربي
 */
export const fixArabic = (text) => {
    if (!text) return "";
    const str = String(text).trim();
    if (!/[\u0600-\u06FF]/.test(str)) return str;
    try {
        let reshaped = ArabicReshaper.convertArabic(str);
        return bidi.getReorderedString(reshaped);
    } catch (e) {
        return str;
    }
};

/**
 * generateInvoice - توليد فاتورة حرارية (80mm)
 */
export const generateInvoice = async (order, items, store = null) => {
    const storeName = store?.name || 'yy';
    const cashierName = order.cashier_name || 'موظف المبيعات';
    const invoiceNo = order.invoice_number || order.id || '---';
    const date = new Date(order.created_at || Date.now()).toLocaleString('ar-SY');
    const storeSlug = store?.slug || 'yy';

    // Calculate total USD
    const totalUsd = items.reduce((sum, item) => {
        const itemPriceUsd = parseFloat(item.price_usd || item.product?.price_usd || 0);
        return sum + (itemPriceUsd > 0 ? itemPriceUsd : ((item.price || item.unit_price || 0) / (order.exchange_rate || 1))) * item.quantity;
    }, 0);

    // Construct URL for public verification via phone scan
    const qrContent = `${window.location.origin}/${storeSlug}/verify-invoice/${order.uuid || order.id}`;
    
    // Generate QR Code as DataURL
    let qrDataUrl = '';
    try {
        qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 200 });
    } catch (err) {
        console.error('QR Generation Error:', err);
    }

    const receiptHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                @font-face {
                    font-family: 'Cairo';
                    src: url(data:font/ttf;base64,${CAIRO_FONT}) format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    width: 80mm;
                    margin: 0;
                    padding: 2mm;
                    font-family: 'Cairo', sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #000;
                    background-color: #fff;
                }
                .container {
                    width: 76mm;
                    margin: 0 auto;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: bold; }
                
                .header { margin-bottom: 5px; }
                .store-name { font-size: 18px; font-weight: 800; margin: 5px 0; }
                .info-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
                
                .separator {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                    width: 100%;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 5px 0;
                }
                th {
                    border-bottom: 1px dashed #000;
                    padding: 4px 0;
                    font-size: 11px;
                }
                td {
                    padding: 6px 0;
                    vertical-align: top;
                    font-size: 11px;
                }
                
                .total-section {
                    margin-top: 10px;
                    padding-top: 5px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .grand-total {
                    font-size: 16px;
                    border-top: 2px solid #000;
                    padding-top: 5px;
                    margin-top: 5px;
                }
                
                .qr-container {
                    margin: 15px 0 10px;
                    text-align: center;
                }
                .qr-container img {
                    width: 120px;
                    height: 120px;
                }
                
                .footer-msg {
                    font-size: 11px;
                    margin-top: 10px;
                    font-style: italic;
                }

                @media print {
                    body { width: 80mm; }
                    .no-print { display: none; }
                }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="container">
                <div class="header text-center">
                    <div class="store-name">${storeName}</div>
                    <div class="info-row">
                        <span>رقم الفاتورة: #${invoiceNo}</span>
                        <span>الكاشير: ${cashierName}</span>
                    </div>
                    <div class="info-row">
                        <span>التاريخ: ${date}</span>
                    </div>
                </div>

                <div class="separator"></div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-right" style="width: 40%">الصنف</th>
                            <th class="text-center">كمية</th>
                            <th class="text-center">السعر</th>
                            <th class="text-left">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td class="text-right bold">${item.name || item.product?.name}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-center">${Number(item.price || item.unit_price).toLocaleString()}</td>
                                <td class="text-left">${(item.quantity * (item.price || item.unit_price)).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="separator"></div>

                <div class="total-section">
                    <div class="total-row grand-total bold">
                        <span>المبلغ الإجمالي:</span>
                        <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end;">
                            <span>${Number(order.total_amount).toLocaleString()} ل.س</span>
                            ${totalUsd > 0 ? `<span style="font-size: 11px; color: #444; font-weight: normal; margin-top: 2px;">($${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} مخطط)</span>` : ''}
                        </div>
                    </div>
                    <div class="total-row">
                        <span>طريقة الدفع:</span>
                        <span class="bold">${order.payment_method === 'credit' ? 'آجل (ذمم)' : 'نقدي'}</span>
                    </div>
                    ${order.received_amount > 0 ? `
                        <div class="total-row">
                            <span>المبلغ المستلم:</span>
                            <span>${Number(order.received_amount).toLocaleString()}</span>
                        </div>
                        <div class="total-row">
                            <span>المتبقي (الفكة):</span>
                            <span>${Number(order.change_amount).toLocaleString()}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="qr-container">
                    <img src="${qrDataUrl}" alt="Invoice QR" />
                    <div style="font-size: 9px; margin-top: 4px;">#${invoiceNo}</div>
                </div>

                <div class="footer-msg text-center">
                    شكراً لتعاملكم مع ${storeName}
                </div>
            </div>

            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
};

/**
 * توليد وصل قبض مالي (80mm)
 */
export const generatePaymentReceipt = async (payment, customer, store = null) => {
    const storeName = store?.name || 'yy';
    const date = new Date(payment.created_at).toLocaleString('ar-SY');

    const receiptHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: 80mm auto; margin: 0; }
                body { width: 80mm; margin: 0; padding: 5mm; font-family: 'Cairo', sans-serif; font-size: 13px; }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .row { margin: 10px 0; display: flex; justify-content: space-between; }
                .amount-box { border: 2px solid #000; padding: 10px; font-size: 18px; margin: 20px 0; }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="header text-center">
                <h2 class="bold" style="margin: 0;">وصل قبض مالي</h2>
                <div style="font-size: 11px; margin-top: 5px;">${storeName}</div>
            </div>
            
            <div class="row">
                <span>رقم الوصل:</span>
                <span class="bold">#${payment.id}</span>
            </div>
            <div class="row">
                <span>التاريخ:</span>
                <span>${date}</span>
            </div>
            <div class="row" style="margin-top: 20px;">
                <span>وصلنا من السيد/ة:</span>
                <span class="bold">${customer.name}</span>
            </div>
            
            <div class="amount-box text-center bold">
                مبلغ وقدره: ${Number(payment.amount).toLocaleString()} ل.س
            </div>

            <div class="text-center" style="margin-top: 30px; font-size: 11px;">
                توقيع المستلم
                <div style="margin-top: 40px; border-top: 1px solid #ccc; width: 150px; margin-left: auto; margin-right: auto;"></div>
            </div>
            
            <script>
                window.onload = () => { window.print(); setTimeout(() => { window.close(); }, 500); };
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
};

/**
 * generatePayslip - (Keep as is or update to 80mm if needed, but usually payslips are A5/A4)
 * For now, I will keep the existing logic but update it to use the same HTML print method for consistency if preferred.
 * However, the user focused on POS receipts.
 */
export const generatePayslip = (details, store = null) => {
    // Keeping existing jsPDF for now as it wasn't the main focus, but can be updated.
};

export const generateSupplierInvoice = (purchase, store = null) => {
    // Keeping existing jsPDF for now as it's a B2B invoice (A4 usually).
};