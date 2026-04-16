import { Card, Text, Button, Badge } from '@mantine/core';
import { useBanking } from '../context/BankingContext';

interface CardDetailProps {
  cardId: string;
  onBack: () => void;
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

function formatInterval(interval: string): string {
  switch (interval) {
    case 'per_transaction': return 'per transaction';
    case 'per_day': return 'per day';
    case 'per_week': return 'per week';
    case 'per_month': return 'per month';
    case 'all_time': return 'all time';
    default: return interval;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'green';
    case 'disabled':
      return 'red';
    case 'canceled':
      return 'gray';
    default:
      return 'blue';
  }
}

export function CardDetail({ cardId, onBack }: CardDetailProps) {
  const { cards, transactions } = useBanking();
  const card = cards.find((c) => c.id === cardId);
  const cardTransactions = transactions.filter((t) => t.route_id === cardId);

  if (!card) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="subtle" onClick={onBack}>
          ← Back to Cards
        </Button>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed">Card not found</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="subtle" onClick={onBack} className="self-start">
        ← Back to Cards
      </Button>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex justify-between items-start mb-4">
          <div>
            <Text size="sm" c="dimmed">Card</Text>
            <Text size="xl" fw={700} ff="monospace">
              •••• {card.last4}
            </Text>
          </div>
          <Badge variant="light" color={getStatusColor(card.status)}>
            {card.status}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          {card.description && (
            <div>
              <Text size="sm" c="dimmed">Description</Text>
              <Text>{card.description}</Text>
            </div>
          )}

          <div>
            <Text size="sm" c="dimmed">Usage</Text>
            <Text>{card.authorization_controls?.usage?.category === 'single_use' ? 'Single-use' : 'Multi-use'}</Text>
          </div>

          {card.authorization_controls?.usage?.category === 'single_use' &&
            card.authorization_controls.usage.single_use && (
              <div>
                <Text size="sm" c="dimmed">Amount Limit</Text>
                <Text>
                  {card.authorization_controls.usage.single_use.settlement_amount.comparison === 'equals'
                    ? 'Exactly '
                    : 'Up to '}
                  {formatCurrency(card.authorization_controls.usage.single_use.settlement_amount.value)}
                </Text>
              </div>
            )}

          {card.authorization_controls?.usage?.category === 'multi_use' &&
            card.authorization_controls.usage.multi_use?.spending_limits?.map((limit, i) => (
              <div key={i}>
                <Text size="sm" c="dimmed">Spending Limit</Text>
                <Text>
                  {formatCurrency(limit.settlement_amount)} {formatInterval(limit.interval)}
                </Text>
              </div>
            ))}

          <div>
            <Text size="sm" c="dimmed">Created</Text>
            <Text>{formatDate(card.created_at)}</Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">Card ID</Text>
            <Text ff="monospace" size="sm">{card.id}</Text>
          </div>
        </div>
      </Card>

      {/* Card Transactions */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text fw={600} mb="md">Card Transactions</Text>
        {cardTransactions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {cardTransactions.map((txn) => (
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
          <Text c="dimmed" size="sm">No transactions for this card</Text>
        )}
      </Card>
    </div>
  );
}
