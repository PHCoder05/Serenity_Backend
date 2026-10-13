export type InvoicePdfLine = {
  title: string;
  quantity: number;
  linePrice: number;
  detail?: string | null;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  gstin: string;
  orderedAt: string;
  orderId: string;
  fulfillment: string;
  paidVia: string;
  subtotal: number;
  couponDiscount: number;
  cgst: number;
  sgst: number;
  gstRate: number;
  deliveryFee: number;
  loyaltyDiscount: number;
  total: number;
  amountPaid: number;
  lines: InvoicePdfLine[];
};

function toWinAnsi(text: string): string {
  return text
    .replace(/₹/g, 'Rs ')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapePdf(text: string): string {
  return toWinAnsi(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function rupees(value: number): string {
  return `Rs ${value}`;
}

/** Minimal PDF 1.4 text document — no native deps. */
export function buildInvoicePdf(invoice: InvoicePdfInput): Buffer {
  const gstPct = (invoice.gstRate * 50).toFixed(2);
  const rows: string[] = [
    'Tax Invoice',
    'Serenity Cafe - MIT ADT, Rajbaug',
    `GSTIN ${invoice.gstin}`,
    `${invoice.invoiceNumber}  ${invoice.orderedAt.slice(0, 10)}  ${invoice.orderId}`,
    `${invoice.fulfillment}  Paid via ${invoice.paidVia}`,
    '',
    'Item                              Qty     Amount',
    '------------------------------------------------',
    ...invoice.lines.map((line) => {
      const title = line.detail
        ? `${line.title} (${line.detail})`
        : line.title;
      return `${title.slice(0, 32).padEnd(32)} ${String(line.quantity).padStart(3)}  ${rupees(line.linePrice)}`;
    }),
    '------------------------------------------------',
    `Subtotal                                  ${rupees(invoice.subtotal)}`,
  ];

  if (invoice.couponDiscount) {
    rows.push(`Discount                                 ${rupees(invoice.couponDiscount)}`);
  }
  rows.push(`CGST (${gstPct}%)                             ${rupees(invoice.cgst)}`);
  rows.push(`SGST (${gstPct}%)                             ${rupees(invoice.sgst)}`);
  if (invoice.deliveryFee) {
    rows.push(`Delivery                                 ${rupees(invoice.deliveryFee)}`);
  }
  if (invoice.loyaltyDiscount) {
    rows.push(`Loyalty                                  ${rupees(invoice.loyaltyDiscount)}`);
  }
  rows.push(`Total                                    ${rupees(invoice.total)}`);
  rows.push(`Amount paid                              ${rupees(invoice.amountPaid)}`);

  return renderTextPdf(rows);
}

function renderTextPdf(lines: string[]): Buffer {
  const ops = lines
    .map((line, index) => {
      const y = 800 - index * 14;
      return `BT /F1 11 Tf 48 ${y} Td (${escapePdf(line)}) Tj ET`;
    })
    .join('\n');
  const stream = Buffer.from(ops, 'ascii');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${ops}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let offset = 0;
  const header = '%PDF-1.4\n';
  offset += Buffer.byteLength(header, 'ascii');
  const xrefEntries = ['0000000000 65535 f \n'];
  let body = '';
  for (const object of objects) {
    xrefEntries.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
    body += object;
    offset += Buffer.byteLength(object, 'ascii');
  }
  const xrefOffset = offset;
  const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join('')}`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'ascii');
}
