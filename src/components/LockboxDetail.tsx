import { useState } from 'react';
import { Card, Text, Button } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession } from '../types';
import { formatCurrency } from '../lib/formatting';

interface LockboxDetailProps {
  session: DemoSession;
  onBack: () => void;
  onRefresh: () => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LockboxDetail({ session, onBack }: LockboxDetailProps) {
  const { lockboxAddresses, lockboxRecipients, transactions, rollLockbox } = useBanking();
  const { addRequest } = useApiLog();
  const [isRolling, setIsRolling] = useState(false);

  // Use context data if available, otherwise fall back to session data
  const primaryRecipient = lockboxRecipients[0] || session.lockboxRecipient;
  const primaryAddress =
    lockboxAddresses.find((a) => a.id === primaryRecipient?.lockbox_address_id) ||
    lockboxAddresses[0] ||
    session.lockboxAddress;
  const lockboxTransactions = transactions.filter(
    (t) => t.route_id === primaryRecipient?.id || t.route_id === primaryAddress?.id
  );

  const handleRoll = async () => {
    setIsRolling(true);
    try {
      await rollLockbox(session.config.apiKey, session.account.id, addRequest);
    } finally {
      setIsRolling(false);
    }
  };

  if (!primaryRecipient && !primaryAddress) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="subtle" onClick={onBack}>
          ← Back to Overview
        </Button>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed">No lockbox available</Text>
        </Card>
      </div>
    );
  }

  const title =
    primaryRecipient?.recipient_name ||
    primaryRecipient?.description ||
    primaryAddress?.description ||
    'Primary Lockbox';

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="subtle" onClick={onBack} className="self-start">
        ← Back to Overview
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="sm" c="dimmed">Lockbox</Text>
            <Text size="xl" fw={700}>{title}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              color="blue"
              size="xs"
              loading={isRolling}
              onClick={handleRoll}
            >
              ↻ Roll
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <Text size="sm" c="dimmed">Mailing Address</Text>
            <Text>{title}</Text>
            {primaryRecipient?.mail_stop_code && (
              <Text>Mail Stop {primaryRecipient.mail_stop_code}</Text>
            )}
            <Text>{primaryAddress?.address?.line1}</Text>
            {primaryAddress?.address?.line2 && (
              <Text>{primaryAddress.address.line2}</Text>
            )}
            <Text>
              {primaryAddress?.address?.city}, {primaryAddress?.address?.state}{' '}
              {primaryAddress?.address?.postal_code}
            </Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Created</Text>
            <Text>{formatDate(primaryRecipient?.created_at || primaryAddress!.created_at)}</Text>
          </div>

          {primaryAddress && (
            <div>
              <Text size="sm" c="dimmed">Lockbox Address ID</Text>
              <Text ff="monospace" size="sm">{primaryAddress.id}</Text>
            </div>
          )}

          {primaryRecipient && (
            <div>
              <Text size="sm" c="dimmed">Lockbox Recipient ID</Text>
              <Text ff="monospace" size="sm">{primaryRecipient.id}</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Lockbox Transactions */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text fw={600} mb="md">Lockbox Transactions</Text>
        {lockboxTransactions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {lockboxTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex justify-between items-center p-2 rounded bg-gray-50"
              >
                <div className="flex flex-col">
                  <Text size="sm" fw={500}>{txn.description}</Text>
                  <Text size="xs" c="dimmed">{formatDate(txn.created_at)}</Text>
                </div>
                <Text
                  size="sm"
                  fw={600}
                  c={txn.amount >= 0 ? 'green' : 'red'}
                  ff="monospace"
                >
                  {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Text c="dimmed" size="sm">No transactions for this lockbox</Text>
        )}
      </Card>
    </div>
  );
}
