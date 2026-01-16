// Sample invoice data - matches the static PDF in public/sample-invoice.pdf
// Run `pnpm exec tsx scripts/generate-invoice.ts` to regenerate the PDF

export const SAMPLE_INVOICE = {
  invoiceNumber: 'INV-2024-0847',
  vendorName: 'ACME Corporation',
  amount: 499999, // $4,999.99 in cents
  achInstructions: {
    routingNumber: '101050001',
    accountNumber: '9876543210',
  },
};
