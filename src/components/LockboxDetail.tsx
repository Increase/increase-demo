import { useState } from 'react';
import { Card, Text, Button, Badge } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession } from '../types';

interface LockboxDetailProps {
  session: DemoSession;
  onBack: () => void;
  onRefresh: () => void;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LockboxDetail({ session, onBack, onRefresh }: LockboxDetailProps) {
  const { lockboxes, transactions, rollLockbox } = useBanking();
  const { addRequest } = useApiLog();
  const [isRolling, setIsRolling] = useState(false);

  // Use context data if available, otherwise fall back to session data
  const primaryLockbox = lockboxes[0] || session.lockbox;
  const lockboxTransactions = transactions.filter(
    (t) => t.route_id === primaryLockbox?.id
  );

  const handleRoll = async () => {
    setIsRolling(true);
    try {
      await rollLockbox(session.config.apiKey, session.account.id, addRequest);
    } finally {
      setIsRolling(false);
    }
  };

  if (!primaryLockbox) {
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="subtle" onClick={onBack} className="self-start">
        ← Back to Overview
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="sm" c="dimmed">Lockbox</Text>
            <Text size="xl" fw={700}>
              {primaryLockbox.description || 'Primary Lockbox'}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="light"
              color={primaryLockbox.status === 'active' ? 'green' : 'gray'}
            >
              {primaryLockbox.status}
            </Badge>
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
            <Text>{primaryLockbox.address?.recipient_name}</Text>
            <Text>{primaryLockbox.address?.line1}</Text>
            {primaryLockbox.address?.line2 && (
              <Text>{primaryLockbox.address.line2}</Text>
            )}
            <Text>
              {primaryLockbox.address?.city}, {primaryLockbox.address?.state}{' '}
              {primaryLockbox.address?.postal_code}
            </Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Created</Text>
            <Text>{formatDate(primaryLockbox.created_at)}</Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Lockbox ID</Text>
            <Text ff="monospace" size="sm">{primaryLockbox.id}</Text>
          </div>
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
