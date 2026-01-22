import { Card, Text, Button, Badge } from '@mantine/core';
import { useBanking } from '../context/BankingContext';

interface TransactionDetailProps {
  transactionId: string;
  onBack: () => void;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

export function TransactionDetail({ transactionId, onBack }: TransactionDetailProps) {
  const { transactions } = useBanking();
  const transaction = transactions.find((t) => t.id === transactionId);

  if (!transaction) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="subtle" onClick={onBack}>
          ← Back to Overview
        </Button>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed">Transaction not found</Text>
        </Card>
      </div>
    );
  }

  const sourceCategory = transaction.source?.category?.replace(/_/g, ' ') || 'unknown';

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="subtle" onClick={onBack} className="self-start">
        ← Back to Overview
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="sm" c="dimmed">Amount</Text>
            <Text
              size="xl"
              fw={700}
              c={transaction.amount >= 0 ? 'green' : 'red'}
            >
              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
            </Text>
          </div>
          <Badge variant="light" size="lg">
            {sourceCategory}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <Text size="sm" c="dimmed">Description</Text>
            <Text fw={500}>{transaction.description}</Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Date</Text>
            <Text>{formatDate(transaction.created_at)}</Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Transaction ID</Text>
            <Text ff="monospace" size="sm">{transaction.id}</Text>
          </div>

          {transaction.route_id && (
            <div>
              <Text size="sm" c="dimmed">Route ID</Text>
              <Text ff="monospace" size="sm">{transaction.route_id}</Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
