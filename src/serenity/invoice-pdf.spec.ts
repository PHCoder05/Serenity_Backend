import { buildInvoicePdf } from './invoice-pdf';

describe('buildInvoicePdf', () => {
  it('should emit a PDF 1.4 document with invoice fields', () => {
    const pdf = buildInvoicePdf({
      invoiceNumber: 'INV-TEST-1',
      gstin: 'GSTIN-PENDING',
      orderedAt: '2026-10-13T10:00:00.000Z',
      orderId: 'ord-1',
      fulfillment: 'Serenity Café, Rajbaug (Takeaway)',
      paidVia: 'UPI',
      subtotal: 200,
      couponDiscount: 0,
      cgst: 5,
      sgst: 5,
      gstRate: 0.05,
      deliveryFee: 0,
      loyaltyDiscount: 0,
      total: 210,
      amountPaid: 210,
      lines: [{ title: 'Green bowl', quantity: 1, linePrice: 200 }],
    });

    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('INV-TEST-1');
    expect(text).toContain('Green bowl');
    expect(text).toContain('%%EOF');
  });
});
