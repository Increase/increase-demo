import { useState } from 'react';
import { Card, Badge, Button, Divider, Text } from '@mantine/core';
import type { BillPayment, BillPaymentStatus } from '../types';

interface BillPaymentDetailProps {
  payment: BillPayment;
  onBack: () => void;
  onSettleAndPay: (paymentId: string) => Promise<void>;
  onSettleCredit: (paymentId: string) => Promise<void>;
  onSimulateCardAuth: (paymentId: string) => Promise<void>;
}

const STATUS_CONFIG: Record<BillPaymentStatus, { label: string; color: string }> = {
  pending_debit: { label: 'Pending', color: 'gray' },
  debit_processing: { label: 'Processing', color: 'blue' },
  debit_failed: { label: 'Failed', color: 'red' },
  pending_credit: { label: 'Processing', color: 'blue' },
  credit_submitted: { label: 'Processing', color: 'blue' },
  credit_mailed: { label: 'Processing', color: 'blue' },
  pending_authorization: { label: 'Processing', color: 'orange' },
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

interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'pending';
}

function getTimelineSteps(payment: BillPayment): TimelineStep[] {
  const network = payment.paymentDetails.network;
  const status = payment.status;

  // Debit steps (common to all)
  const debitSteps: TimelineStep[] = [
    {
      label: 'Debit initiated',
      status: status === 'pending_debit' ? 'current' : 'completed',
    },
    {
      label: 'Debit settled',
      status: ['pending_debit', 'debit_processing'].includes(status)
        ? (status === 'debit_processing' ? 'current' : 'pending')
        : 'completed',
    },
  ];

  // Credit steps vary by network
  const getCreditSteps = (): TimelineStep[] => {
    const isPostDebit = !['pending_debit', 'debit_processing', 'debit_failed'].includes(status);

    switch (network) {
      case 'ach':
        return [
          {
            label: 'ACH credit submitted',
            status: !isPostDebit ? 'pending' : (status === 'pending_credit' ? 'current' : 'completed'),
          },
          {
            label: 'ACH credit settled',
            status: status === 'completed' ? 'completed' : (status === 'credit_submitted' ? 'current' : 'pending'),
          },
        ];
      case 'wire':
        return [
          {
            label: 'Wire sent',
            status: status === 'completed' ? 'completed' : (isPostDebit ? 'current' : 'pending'),
          },
        ];
      case 'rtp':
        return [
          {
            label: 'RTP sent',
            status: status === 'completed' ? 'completed' : (isPostDebit ? 'current' : 'pending'),
          },
        ];
      case 'check':
        return [
          {
            label: 'Check mailed',
            status: !isPostDebit ? 'pending' : (['credit_mailed', 'completed'].includes(status) ? 'completed' : 'current'),
          },
          {
            label: 'Check deposited',
            status: status === 'completed' ? 'completed' : (status === 'credit_mailed' ? 'current' : 'pending'),
          },
        ];
      case 'card':
        return [
          {
            label: 'Card created',
            status: !isPostDebit ? 'pending' : 'completed',
          },
          {
            label: 'Card authorized',
            status: status === 'completed' ? 'completed' : (status === 'pending_authorization' ? 'current' : 'pending'),
          },
        ];
      default:
        return [];
    }
  };

  if (status === 'failed' || status === 'debit_failed') {
    // Show failed state in timeline
    return [
      ...debitSteps.map(s => ({ ...s, status: s.status as TimelineStep['status'] })),
      { label: 'Payment failed', status: 'current' as const },
    ];
  }

  return [...debitSteps, ...getCreditSteps()];
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full border-2 ${
                step.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : step.status === 'current'
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-300'
              }`}
            />
            {index < steps.length - 1 && (
              <div
                className={`w-0.5 h-6 ${
                  step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
          <Text
            size="sm"
            c={step.status === 'pending' ? 'dimmed' : undefined}
            fw={step.status === 'current' ? 600 : undefined}
            className="-mt-0.5"
          >
            {step.label}
          </Text>
        </div>
      ))}
    </div>
  );
}

export function BillPaymentDetail({ payment, onBack, onSettleAndPay, onSettleCredit, onSimulateCardAuth }: BillPaymentDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const statusConfig = STATUS_CONFIG[payment.status];
  const details = payment.paymentDetails;
  const timelineSteps = getTimelineSteps(payment);

  // Determine which simulation button to show
  const getSimulationAction = () => {
    switch (payment.status) {
      case 'debit_processing':
        return {
          label: 'Settle Debit',
          onClick: async () => {
            setIsLoading(true);
            try {
              await onSettleAndPay(payment.id);
            } finally {
              setIsLoading(false);
            }
          },
        };
      case 'credit_submitted':
        return {
          label: 'Settle Credit',
          onClick: async () => {
            setIsLoading(true);
            try {
              await onSettleCredit(payment.id);
            } finally {
              setIsLoading(false);
            }
          },
        };
      case 'credit_mailed':
        return {
          label: 'Deposit Check',
          onClick: async () => {
            setIsLoading(true);
            try {
              await onSettleCredit(payment.id);
            } finally {
              setIsLoading(false);
            }
          },
        };
      case 'pending_authorization':
        return {
          label: 'Authorize Card',
          onClick: async () => {
            setIsLoading(true);
            try {
              await onSimulateCardAuth(payment.id);
            } finally {
              setIsLoading(false);
            }
          },
        };
      default:
        return null;
    }
  };

  const simulationAction = getSimulationAction();

  return (
    <div className="flex flex-col gap-4">
      <Button variant="subtle" size="sm" onClick={onBack} className="self-start">
        ← Back to list
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {/* Header with amount and status */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="xl" fw={600}>
              ${(payment.amount / 100).toLocaleString()}
            </Text>
            <Badge size="md" color={statusConfig.color} variant="light" mt={4}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Payment Details */}
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <Text c="dimmed">Network:</Text>
            <Text>{NETWORK_LABELS[details.network]}</Text>
          </div>
          <div className="flex justify-between">
            <Text c="dimmed">Created:</Text>
            <Text>{payment.createdAt.toLocaleString()}</Text>
          </div>

          {(details.network === 'ach' || details.network === 'rtp' || details.network === 'wire') && (
            <>
              <div className="flex justify-between">
                <Text c="dimmed">Account:</Text>
                <Text ff="monospace">{details.routingNumber} / {details.accountNumber}</Text>
              </div>
              <div className="flex justify-between">
                <Text c="dimmed">Descriptor:</Text>
                <Text>{details.statementDescriptor}</Text>
              </div>
            </>
          )}

          {details.network === 'check' && (
            <>
              <div className="flex justify-between">
                <Text c="dimmed">Recipient:</Text>
                <Text>{details.recipientName}</Text>
              </div>
              <div className="flex justify-between">
                <Text c="dimmed">Address:</Text>
                <Text>
                  {details.city}, {details.state} {details.zip}
                </Text>
              </div>
            </>
          )}

          {details.network === 'card' && (
            <>
              <div className="flex justify-between">
                <Text c="dimmed">Description:</Text>
                <Text>{details.description}</Text>
              </div>
              {payment.cardLast4 && (
                <div className="flex justify-between">
                  <Text c="dimmed">Card:</Text>
                  <Text ff="monospace">•••• {payment.cardLast4}</Text>
                </div>
              )}
            </>
          )}
        </div>

        <Divider my="md" />

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <Text fw={600} size="sm">Timeline</Text>
            {simulationAction && (
              <Button
                size="xs"
                color="violet"
                onClick={simulationAction.onClick}
                loading={isLoading}
              >
                🪄 {simulationAction.label}
              </Button>
            )}
          </div>
          <Timeline steps={timelineSteps} />
        </div>

        {/* Error display */}
        {payment.error && (
          <>
            <Divider my="md" />
            <Text c="red" size="sm">
              <span className="font-semibold">Error:</span> {payment.error}
            </Text>
          </>
        )}
      </Card>
    </div>
  );
}
