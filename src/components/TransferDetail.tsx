import { useState, useEffect, useCallback } from 'react';
import { Card, Text, Button, Badge, Divider, Loader } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import { createIncreaseClient } from '../lib/increase';
import type { DemoSession, TransferDetailType } from '../types';

interface TransferDetailProps {
  transferType: TransferDetailType;
  transferId: string;
  session: DemoSession;
  onBack: () => void;
  onRefresh: () => void;
}

function formatCurrency(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------- Timeline ----------

interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'pending';
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

// ---------- Type config ----------

const TYPE_LABELS: Record<TransferDetailType, string> = {
  ach_transfer: 'ACH Transfer',
  wire_transfer: 'Wire Transfer',
  rtp_transfer: 'RTP Transfer',
  check_transfer: 'Check Transfer',
  card_payment: 'Card Payment',
  check_deposit: 'Check Deposit',
  inbound_ach_transfer: 'Inbound ACH Transfer',
  inbound_wire_transfer: 'Inbound Wire Transfer',
};

function getStatusColor(status: string): string {
  if (['complete', 'submitted', 'accepted', 'deposited', 'returned'].includes(status)) return 'green';
  if (['canceled', 'rejected', 'declined', 'stopped', 'reversed'].includes(status)) return 'red';
  if (['requires_attention'].includes(status)) return 'orange';
  return 'blue';
}

// ---------- Timeline builders ----------

function achTimeline(status: string): TimelineStep[] {
  const order = ['pending_submission', 'submitted', 'returned'];
  const idx = order.indexOf(status);
  const settled = status === 'returned'; // returned is a terminal settled state
  return [
    { label: 'Created', status: 'completed' },
    { label: 'Submitted', status: idx >= 1 || settled ? 'completed' : (status === 'pending_submission' ? 'current' : 'pending') },
    { label: 'Settled', status: settled ? 'completed' : (status === 'submitted' ? 'current' : 'pending') },
  ];
}

function wireTimeline(status: string): TimelineStep[] {
  const done = status === 'complete' || status === 'reversed';
  const submitted = status === 'submitted' || done;
  return [
    { label: 'Created', status: 'completed' },
    { label: 'Submitted', status: submitted ? 'completed' : (status === 'pending_creating' ? 'current' : 'current') },
    { label: 'Complete', status: done ? 'completed' : (status === 'submitted' ? 'current' : 'pending') },
  ];
}

function rtpTimeline(status: string): TimelineStep[] {
  const done = status === 'complete';
  const submitted = status === 'submitted' || done;
  return [
    { label: 'Created', status: 'completed' },
    { label: 'Submitted', status: submitted ? 'completed' : 'current' },
    { label: 'Complete', status: done ? 'completed' : (status === 'submitted' ? 'current' : 'pending') },
  ];
}

function checkTransferTimeline(status: string): TimelineStep[] {
  const mailed = ['mailed', 'deposited'].includes(status);
  const deposited = status === 'deposited';
  return [
    { label: 'Created', status: 'completed' },
    { label: 'Pending mailing', status: mailed ? 'completed' : (status === 'pending_mailing' ? 'current' : 'current') },
    { label: 'Mailed', status: mailed ? 'completed' : 'pending' },
    { label: 'Deposited', status: deposited ? 'completed' : (status === 'mailed' ? 'current' : 'pending') },
  ];
}

function cardPaymentTimeline(transfer: Record<string, unknown>): TimelineStep[] {
  const state = transfer.state as Record<string, unknown> | undefined;
  const authorizedAmount = (state?.authorized_amount as number) || 0;
  const settledAmount = (state?.settled_amount as number) || 0;
  const authorized = authorizedAmount > 0;
  const settled = settledAmount > 0;
  return [
    { label: 'Authorized', status: authorized ? 'completed' : 'current' },
    { label: 'Settled', status: settled ? 'completed' : (authorized ? 'current' : 'pending') },
  ];
}

function inboundTimeline(status: string): TimelineStep[] {
  return [
    { label: 'Received', status: 'completed' },
    { label: status === 'accepted' ? 'Accepted' : status === 'pending' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1), status: status === 'pending' ? 'current' : 'completed' },
  ];
}

function checkDepositTimeline(status: string): TimelineStep[] {
  const submitted = ['submitted', 'accepted'].includes(status);
  const accepted = status === 'accepted';
  return [
    { label: 'Received', status: 'completed' },
    { label: 'Submitted', status: submitted ? 'completed' : 'current' },
    { label: 'Accepted', status: accepted ? 'completed' : (submitted ? 'current' : 'pending') },
  ];
}

// ---------- Simulation config ----------

interface SimulationAction {
  label: string;
  transferType: TransferDetailType;
}

function getSimulationAction(
  transferType: TransferDetailType,
  transfer: Record<string, unknown>
): SimulationAction | null {
  const status = transfer.status as string;

  switch (transferType) {
    case 'ach_transfer':
      if (['pending_submission', 'submitted'].includes(status))
        return { label: 'Settle ACH Transfer', transferType };
      return null;
    case 'wire_transfer':
      if (['pending_approval', 'pending_creating'].includes(status))
        return { label: 'Submit Wire Transfer', transferType };
      return null;
    case 'rtp_transfer':
      if (['pending_submission', 'submitted'].includes(status))
        return { label: 'Complete RTP Transfer', transferType };
      return null;
    case 'check_transfer':
      if (['pending_submission', 'pending_mailing'].includes(status))
        return { label: 'Mail Check', transferType };
      return null;
    default:
      return null;
  }
}

// ---------- Component ----------

export function TransferDetail({
  transferType,
  transferId,
  session,
  onBack,
  onRefresh,
}: TransferDetailProps) {
  const { simulateTransferActivity } = useBanking();
  const { addRequest } = useApiLog();
  const [transfer, setTransfer] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfer = useCallback(async () => {
    const client = createIncreaseClient(session.config.apiKey);
    try {
      let result: unknown;
      switch (transferType) {
        case 'ach_transfer':
          result = await client.achTransfers.retrieve(transferId);
          break;
        case 'wire_transfer':
          result = await client.wireTransfers.retrieve(transferId);
          break;
        case 'rtp_transfer':
          result = await client.realTimePaymentsTransfers.retrieve(transferId);
          break;
        case 'check_transfer':
          result = await client.checkTransfers.retrieve(transferId);
          break;
        case 'card_payment':
          result = await client.cardPayments.retrieve(transferId);
          break;
        case 'check_deposit':
          result = await client.checkDeposits.retrieve(transferId);
          break;
        case 'inbound_ach_transfer':
          result = await client.inboundACHTransfers.retrieve(transferId);
          break;
        case 'inbound_wire_transfer':
          result = await client.inboundWireTransfers.retrieve(transferId);
          break;
      }
      addRequest({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `${transferType.replace(/_/g, '_')}s/${transferId}`,
        status: 200,
        resourceType: `${transferType}s`,
        resourceId: transferId,
        timestamp: new Date(),
      });
      setTransfer(result as Record<string, unknown>);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfer');
    } finally {
      setLoading(false);
    }
  }, [session.config.apiKey, transferType, transferId, addRequest]);

  useEffect(() => {
    fetchTransfer();
  }, [fetchTransfer]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await simulateTransferActivity(session.config.apiKey, transferType, transferId, addRequest);
      onRefresh();
      await fetchTransfer();
    } catch {
      // visible in debug panel
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="subtle" onClick={onBack} className="self-start">
          ← Back to Overview
        </Button>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <div className="flex justify-center p-8"><Loader /></div>
        </Card>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="subtle" onClick={onBack} className="self-start">
          ← Back to Overview
        </Button>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed">{error || 'Transfer not found'}</Text>
        </Card>
      </div>
    );
  }

  const status = (transfer.status as string) || '';
  const amount = (transfer.amount as number) || 0;
  const createdAt = (transfer.created_at as string) || '';
  const simAction = getSimulationAction(transferType, transfer);

  // Build timeline
  let timelineSteps: TimelineStep[];
  switch (transferType) {
    case 'ach_transfer': timelineSteps = achTimeline(status); break;
    case 'wire_transfer': timelineSteps = wireTimeline(status); break;
    case 'rtp_transfer': timelineSteps = rtpTimeline(status); break;
    case 'check_transfer': timelineSteps = checkTransferTimeline(status); break;
    case 'card_payment': timelineSteps = cardPaymentTimeline(transfer); break;
    case 'check_deposit': timelineSteps = checkDepositTimeline(status); break;
    case 'inbound_ach_transfer':
    case 'inbound_wire_transfer':
      timelineSteps = inboundTimeline(status);
      break;
    default: timelineSteps = [];
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="subtle" onClick={onBack} className="self-start">
        ← Back to Overview
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="sm" c="dimmed">{TYPE_LABELS[transferType]}</Text>
            <Text size="xl" fw={700} c={amount >= 0 ? 'green' : 'red'}>
              {amount >= 0 ? '+' : '-'}{formatCurrency(amount)}
            </Text>
          </div>
          <Badge variant="light" color={getStatusColor(status)} size="lg">
            {status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2 text-sm">
          {createdAt && (
            <div className="flex justify-between">
              <Text c="dimmed">Created</Text>
              <Text>{formatDate(createdAt)}</Text>
            </div>
          )}

          <div className="flex justify-between">
            <Text c="dimmed">ID</Text>
            <Text ff="monospace" size="xs">{transferId}</Text>
          </div>

          {/* ACH-specific */}
          {transferType === 'ach_transfer' && (
            <>
              {transfer.statement_descriptor && (
                <div className="flex justify-between">
                  <Text c="dimmed">Statement Descriptor</Text>
                  <Text>{transfer.statement_descriptor as string}</Text>
                </div>
              )}
              {transfer.routing_number && (
                <div className="flex justify-between">
                  <Text c="dimmed">Routing / Account</Text>
                  <Text ff="monospace">{transfer.routing_number as string} / {transfer.account_number as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Wire-specific */}
          {transferType === 'wire_transfer' && (
            <>
              {transfer.creditor && (
                <div className="flex justify-between">
                  <Text c="dimmed">Creditor</Text>
                  <Text>{(transfer.creditor as Record<string, unknown>)?.name as string}</Text>
                </div>
              )}
              {transfer.routing_number && (
                <div className="flex justify-between">
                  <Text c="dimmed">Routing / Account</Text>
                  <Text ff="monospace">{transfer.routing_number as string} / {transfer.account_number as string}</Text>
                </div>
              )}
            </>
          )}

          {/* RTP-specific */}
          {transferType === 'rtp_transfer' && (
            <>
              {transfer.creditor_name && (
                <div className="flex justify-between">
                  <Text c="dimmed">Creditor</Text>
                  <Text>{transfer.creditor_name as string}</Text>
                </div>
              )}
              {transfer.remittance_information && (
                <div className="flex justify-between">
                  <Text c="dimmed">Remittance Info</Text>
                  <Text>{transfer.remittance_information as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Check transfer-specific */}
          {transferType === 'check_transfer' && (
            <>
              {transfer.physical_check && (
                <div className="flex justify-between">
                  <Text c="dimmed">Recipient</Text>
                  <Text>{(transfer.physical_check as Record<string, unknown>)?.recipient_name as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Card payment-specific */}
          {transferType === 'card_payment' && (
            <>
              {transfer.card_id && (
                <div className="flex justify-between">
                  <Text c="dimmed">Card ID</Text>
                  <Text ff="monospace" size="xs">{transfer.card_id as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Check deposit-specific */}
          {transferType === 'check_deposit' && (
            <>
              {transfer.check_number && (
                <div className="flex justify-between">
                  <Text c="dimmed">Check Number</Text>
                  <Text>{transfer.check_number as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Inbound ACH-specific */}
          {transferType === 'inbound_ach_transfer' && (
            <>
              {transfer.company_name && (
                <div className="flex justify-between">
                  <Text c="dimmed">Company</Text>
                  <Text>{transfer.company_name as string}</Text>
                </div>
              )}
            </>
          )}

          {/* Inbound wire-specific */}
          {transferType === 'inbound_wire_transfer' && (
            <>
              {transfer.description && (
                <div className="flex justify-between">
                  <Text c="dimmed">Description</Text>
                  <Text>{transfer.description as string}</Text>
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
            {simAction && (
              <Button
                size="xs"
                color="violet"
                onClick={handleSimulate}
                loading={simulating}
              >
                ✨ {simAction.label}
              </Button>
            )}
          </div>
          <Timeline steps={timelineSteps} />
        </div>
      </Card>
    </div>
  );
}
