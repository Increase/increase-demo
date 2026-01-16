import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

// Invoice data - these values will be hard-coded in the app
export const SAMPLE_INVOICE = {
  invoiceNumber: 'INV-2024-0847',
  vendorName: 'ACME Corporation',
  vendorAddress: '1 Coyote Canyon Road\nDesert, AZ 00000',
  amount: 4999_99, // $4,999.99 in cents
  lineItems: [
    { description: 'Giant Rubber Band Slingshot', amount: 1299_99 },
    { description: 'Rocket-Powered Roller Skates', amount: 1849_99 },
    { description: 'Portable Hole (3-pack)', amount: 999_99 },
    { description: 'Bird Seed (50lb bag)', amount: 49_99 },
    { description: 'Anvil, 1-Ton (Express Delivery)', amount: 800_03 },
  ],
  achInstructions: {
    bankName: 'First National Bank of the Desert',
    routingNumber: '101050001',
    accountNumber: '9876543210',
  },
};

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function generateInvoicePDF(): Uint8Array {
  const doc = new jsPDF();
  const { invoiceNumber, vendorName, vendorAddress, amount, lineItems, achInstructions } = SAMPLE_INVOICE;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 25);

  // Invoice number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceNumber}`, 140, 20);
  doc.text(`Date: January 15, 2024`, 140, 26);
  doc.text(`Due Date: February 15, 2024`, 140, 32);

  // Vendor info (From)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(vendorName, 20, 56);
  const addressLines = vendorAddress.split('\n');
  addressLines.forEach((line, i) => {
    doc.text(line, 20, 62 + i * 5);
  });

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 120, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Wile E. Coyote', 120, 56);
  doc.text('Cave #7, Mesa Ridge', 120, 62);
  doc.text('Desert, AZ 00000', 120, 68);

  // Line items header
  const tableTop = 90;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, tableTop - 6, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 22, tableTop);
  doc.text('Amount', 165, tableTop, { align: 'right' });

  // Line items
  doc.setFont('helvetica', 'normal');
  let y = tableTop + 10;
  lineItems.forEach((item) => {
    doc.text(item.description, 22, y);
    doc.text(formatCurrency(item.amount), 188, y, { align: 'right' });
    y += 8;
  });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);

  // Total
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Due:', 130, y);
  doc.setFontSize(12);
  doc.text(formatCurrency(amount), 188, y, { align: 'right' });

  // Payment instructions box
  y += 20;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y - 4, 170, 40, 3, 3, 'F');
  doc.setDrawColor(100, 116, 139);
  doc.roundedRect(20, y - 4, 170, 40, 3, 3, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ACH Payment Instructions', 25, y + 4);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${achInstructions.bankName}`, 25, y + 14);
  doc.text(`Routing Number: ${achInstructions.routingNumber}`, 25, y + 22);
  doc.text(`Account Number: ${achInstructions.accountNumber}`, 25, y + 30);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for choosing ACME - "Quality Is Our #1 Dream"', 105, 280, { align: 'center' });
  doc.text('ACME is not responsible for product malfunctions, cliff-related incidents, or roadrunner escapes.', 105, 286, { align: 'center' });

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

// Generate and save the PDF
const pdfBytes = generateInvoicePDF();
writeFileSync('public/sample-invoice.pdf', Buffer.from(pdfBytes));
console.log('Generated public/sample-invoice.pdf');
console.log('Invoice data:', JSON.stringify(SAMPLE_INVOICE, null, 2));
