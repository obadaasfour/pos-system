import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CAIRO_FONT } from './CairoFont';
import { SHOP_LOGO } from './Logo';
import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/**
 * cleanBase64 - cleans base64 string from whitespace, invalid prefixes and duplicate data URI tags
 */
export const cleanBase64 = (str) => {
    if (!str) return "";
    
    // 1. Remove all whitespace and invisible characters
    let cleaned = String(str).replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    
    // 2. Handle duplicate prefixes (e.g., data:image/png;base64,data:image/png;base64,...)
    // This regex finds the last occurrence of the data URI scheme
    const dataUriMatch = cleaned.match(/data:image\/[a-zA-Z]+;base64,/g);
    if (dataUriMatch && dataUriMatch.length > 1) {
        cleaned = cleaned.substring(cleaned.lastIndexOf('data:image/'));
    }
    
    // 3. Ensure it has at least one valid prefix if it's meant to be a data URI
    if (!cleaned.startsWith('data:image/') && cleaned.length > 30) {
        // If it looks like raw base64, prepend a default PNG prefix (jsPDF works better with it)
        cleaned = 'data:image/png;base64,' + cleaned;
    }
    
    return cleaned;
};

/**
 * fixArabic - يصحح النص العربي ليظهر بشكل صحيح في jsPDF
 * يستخدم Re-shaper لوصل الحروف و BiDi لترتيبها من اليمين لليسار.
 */
export const fixArabic = (text) => {
    if (text === null || text === undefined || text === "") return "";
    
    const str = String(text).trim();
    // التحقق مما إذا كان النص يحتوي على أحرف عربية
    if (!/[\u0600-\u06FF]/.test(str)) return str;
    
    let reshaped = str;
    try {
        // 1. وصل الحروف العربية (Reshaping)
        reshaped = ArabicReshaper.convertArabic(str);
        
        // 2. ترتيب الحروف (BiDi Reordering)
        // bidi-js instance provides getReorderedString directly
        // If it fails with "paragraphs" error, it's likely due to internal bidi-js state
        return bidi.getReorderedString(reshaped);
    } catch (e) {
        console.error("Arabic BiDi Error:", e);
        // Fallback: Return reshaped text even if BiDi reordering fails
        return reshaped;
    }
};

/**
 * توليد فاتورة مبيعات (A4)
 */
export const generateInvoice = (order, items, store = null) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const storeName = store?.name || 'نظام المبيعات';

    try {
        if (CAIRO_FONT) {
            doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_FONT);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
            doc.setFont('Cairo', 'normal');
        }
    } catch (e) {
        console.error("Font Error:", e);
    }

    // Header Branding
    if (store?.logo) {
        try { doc.addImage(cleanBase64(store.logo), 'PNG', 10, 8, 20, 20); } catch (e) { }
    } else if (SHOP_LOGO) {
        try { doc.addImage(cleanBase64(SHOP_LOGO), 'PNG', 10, 8, 20, 20); } catch (e) { }
    }

    doc.setFont('Cairo', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(fixArabic(storeName), 200, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('Cairo', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(fixArabic(store?.address || 'العنوان غير محدد'), 200, 32, { align: 'right' });
    doc.text(fixArabic(`هاتف: ${store?.phone || '-'}`), 200, 37, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(10, 45, 200, 45);

    doc.setFontSize(12);
    doc.setFont('Cairo', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(fixArabic(`فاتورة مبيعات #${order.invoice_number || order.id}`), 105, 52, { align: 'center' });

    const tableHead = [[
        fixArabic('الإجمالي'),
        fixArabic('السعر'),
        fixArabic('الكمية'),
        fixArabic('الصنف'),
        '#'
    ]];

    const tableBody = items.map((item, index) => [
        fixArabic((item.price * item.quantity).toLocaleString()),
        fixArabic(item.price.toLocaleString()),
        String(item.quantity),
        fixArabic(item.name || item.product?.name),
        String(index + 1)
    ]);

    autoTable(doc, {
        startY: 60,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Cairo', halign: 'right', fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('Cairo', 'bold');
    doc.setFontSize(16);
    doc.text(fixArabic(`المبلغ الإجمالي: ${Number(order.total_amount).toLocaleString()} ل.س`), 200, finalY, { align: 'right' });

    const methodLabel = order.payment_method === 'credit' ? 'طريقة الدفع: آجل (ذمم)' : 'طريقة الدفع: نقدي';
    doc.setFontSize(10);
    doc.setFont('Cairo', 'normal');
    doc.text(fixArabic(methodLabel), 200, finalY + 8, { align: 'right' });

    doc.text(fixArabic(`شكراً لتعاملكم مع ${storeName}`), 105, 285, { align: 'center' });

    doc.autoPrint();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};

/**
 * توليد وصل قبض مالي
 */
export const generatePaymentReceipt = (payment, customer, store = null) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a6'
    });

    const storeName = store?.name || 'نظام المبيعات';

    try {
        if (CAIRO_FONT) {
            doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_FONT);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
            doc.setFont('Cairo', 'normal');
        }
    } catch (e) { }

    doc.setFont('Cairo', 'bold');
    doc.setFontSize(14);
    doc.text(fixArabic('وصل قبض مالي'), 52, 12, { align: 'center' });
    doc.line(10, 20, 95, 20);

    doc.setFontSize(10);
    doc.setFont('Cairo', 'normal');
    
    doc.text(fixArabic('رقم الوصل:'), 95, 28, { align: 'right' });
    doc.text(`#${payment.id}`, 75, 28, { align: 'right' });

    doc.text(fixArabic('التاريخ:'), 95, 34, { align: 'right' });
    const dateStr = new Date(payment.created_at).toLocaleString('ar-SY');
    doc.text(dateStr, 85, 34, { align: 'right' });

    doc.setFont('Cairo', 'bold');
    doc.text(fixArabic('وصلنا من:'), 95, 45, { align: 'right' });
    doc.text(fixArabic(customer.name), 95, 50, { align: 'right' });

    doc.text(fixArabic('مبلغ وقدره:'), 95, 60, { align: 'right' });
    doc.setFontSize(14);
    doc.text(fixArabic(`${Number(payment.amount).toLocaleString()} ل.س`), 95, 68, { align: 'right' });

    doc.setFontSize(8);
    doc.text(fixArabic(storeName), 52, 95, { align: 'center' });

    doc.autoPrint();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};

/**
 * توليد كشف راتب موظف (Payslip)
 */
export const generatePayslip = (details, store = null) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a5'
    });

    const storeName = store?.name || 'نظام الرواتب';

    try {
        if (CAIRO_FONT) {
            doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_FONT);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
            doc.setFont('Cairo', 'normal');
        }
    } catch (e) { }

    doc.setFont('Cairo', 'bold');
    doc.setFontSize(16);
    doc.text(fixArabic('كشف راتب شهري'), 74, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(fixArabic(storeName), 138, 10, { align: 'right' });
    
    doc.line(10, 22, 138, 22);

    doc.setFont('Cairo', 'bold');
    doc.text(fixArabic('اسم الموظف:'), 138, 32, { align: 'right' });
    doc.text(fixArabic(details.employee.name), 115, 32, { align: 'right' });

    doc.text(fixArabic('الشهر:'), 138, 38, { align: 'right' });
    doc.text(details.month, 115, 38, { align: 'right' });

    const tableData = [
        [fixArabic(details.base_salary.toLocaleString() + ' ل.س'), fixArabic('الراتب الأساسي')],
        [fixArabic('- ' + details.penalties.toLocaleString() + ' ل.س'), fixArabic('الخصومات')],
        [fixArabic('- ' + details.advances.toLocaleString() + ' ل.س'), fixArabic('السلف')],
        [fixArabic('+ ' + details.bonuses.toLocaleString() + ' ل.س'), fixArabic('المكافآت')]
    ];

    autoTable(doc, {
        startY: 45,
        body: tableData,
        theme: 'striped',
        styles: { font: 'Cairo', halign: 'right' },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, finalY, 128, 12, 'F');
    doc.setFont('Cairo', 'bold');
    doc.text(fixArabic('صافي المبلغ المستحق:'), 135, finalY + 8, { align: 'right' });
    doc.text(fixArabic(details.net_salary.toLocaleString() + ' ل.س'), 40, finalY + 8, { align: 'right' });

    doc.autoPrint();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};

/**
 * توليد فاتورة توريد للمورد (A4)
 */
export const generateSupplierInvoice = (purchase, store = null) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const storeName = purchase.store?.name || store?.name || 'مركز التوريد';

    try {
        if (CAIRO_FONT) {
            doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_FONT);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
            doc.setFont('Cairo', 'normal');
        }
    } catch (e) { }

    // Header Branding
    if (SHOP_LOGO) {
        try { doc.addImage(cleanBase64(SHOP_LOGO), 'PNG', 10, 8, 20, 20); } catch (e) { }
    }

    doc.setFont('Cairo', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(fixArabic(storeName), 200, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('Cairo', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(fixArabic(`فاتورة توريد بضاعة`), 200, 32, { align: 'right' });
    doc.text(fixArabic(`رقم المرجع: ${purchase.invoice_number || purchase.id}`), 200, 37, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(10, 45, 200, 45);

    doc.setFontSize(12);
    doc.setFont('Cairo', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(fixArabic(`كشف استلام بضاعة - ${purchase.supplier?.name || 'مورد مؤدي'}`), 105, 52, { align: 'center' });

    const tableHead = [[
        fixArabic('الإجمالي'),
        fixArabic('سعر التوريد'),
        fixArabic('الكمية'),
        fixArabic('اسم المنتج'),
        '#'
    ]];

    const tableBody = (purchase.items || []).map((item, index) => [
        fixArabic((item.unit_cost_price * item.quantity).toLocaleString()),
        fixArabic(Number(item.unit_cost_price).toLocaleString()),
        String(item.quantity),
        fixArabic(item.product?.name || 'منتج عام'),
        String(index + 1)
    ]);

    autoTable(doc, {
        startY: 60,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Cairo', halign: 'right', fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('Cairo', 'bold');
    doc.setFontSize(16);
    doc.text(fixArabic(`إجمالي الفاتورة: ${Number(purchase.total_amount).toLocaleString()} ل.س`), 200, finalY, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('Cairo', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(fixArabic(`صدرت بتاريخ: ${new Date(purchase.created_at).toLocaleString('ar-SY')}`), 200, finalY + 10, { align: 'right' });

    doc.text(fixArabic(`توقيع المسؤول عن التوريد`), 40, finalY + 25, { align: 'center' });
    doc.line(15, finalY + 45, 65, finalY + 45);

    doc.text(fixArabic(`نظام المبيعات الذكي - Enterprise POS`), 105, 285, { align: 'center' });

    doc.autoPrint();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};