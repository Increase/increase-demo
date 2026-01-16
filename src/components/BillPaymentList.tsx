import { useState } from 'react';
import { Card, Badge, Button, Text, Loader } from '@mantine/core';
import type { BillPayment, BillPaymentStatus } from '../types';

interface BillPaymentListProps {
  payments: BillPayment[];
  onSelect: (payment: BillPayment) => void;
  onCreateNew: () => void;
  onInvoiceDrop: () => void;
  isProcessingInvoice?: boolean;
}

const STATUS_CONFIG: Record<BillPaymentStatus, { label: string; color: string }> = {
  pending_debit: { label: 'Pending Debit', color: 'gray' },
  debit_processing: { label: 'Debit Processing', color: 'blue' },
  debit_failed: { label: 'Debit Failed', color: 'red' },
  pending_credit: { label: 'Pending Credit', color: 'gray' },
  credit_submitted: { label: 'Credit Submitted', color: 'blue' },
  credit_mailed: { label: 'Check Mailed', color: 'blue' },
  pending_authorization: { label: 'Awaiting Card Auth', color: 'orange' },
  completed: { label: 'Completed', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
};

const NETWORK_LABELS: Record<string, string> = {
  ach: 'ACH',
  rtp: 'RTP',
  wire: 'Wire',
  check: 'Check',
  card: 'Card',
};

export function BillPaymentList({ payments, onSelect, onCreateNew, onInvoiceDrop, isProcessingInvoice }: BillPaymentListProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      onInvoiceDrop();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Bill Payments</h2>
        <Button size="sm" onClick={onCreateNew}>
          New Payment
        </Button>
      </div>

      {/* Invoice Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {isProcessingInvoice ? (
          <div className="flex flex-col items-center gap-2">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Processing invoice...</Text>
          </div>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              Drop an invoice PDF here to auto-fill payment details
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              <a href="/sample-invoice.pdf" download className="text-blue-600 hover:underline">
                Download sample invoice
              </a>
            </Text>
          </>
        )}
      </div>

      {payments.length === 0 ? (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center" py="md">
            No bill payments yet. Create one to get started.
          </Text>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {payments.map((payment) => {
            const statusConfig = STATUS_CONFIG[payment.status];
            return (
              <Card
                key={payment.id}
                shadow="sm"
                padding="sm"
                radius="md"
                withBorder
                onClick={() => onSelect(payment)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${(payment.amount / 100).toLocaleString()}
                      </span>
                      <Badge variant="light" size="sm">
                        {NETWORK_LABELS[payment.paymentDetails.network]}
                      </Badge>
                    </div>
                    <Text size="xs" c="dimmed">
                      {payment.createdAt.toLocaleString()}
                    </Text>
                  </div>
                  <Badge color={statusConfig.color} variant="light" size="sm">
                    {statusConfig.label}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
