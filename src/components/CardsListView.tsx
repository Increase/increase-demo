import { useState } from 'react';
import { Card, Text, Button, Badge } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { CreateCardModal } from './CreateCardModal';
import type { DemoSession, BankingViewState } from '../types';

interface CardsListViewProps {
  session: DemoSession;
  onNavigate: (state: BankingViewState) => void;
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

export function CardsListView({ session, onNavigate, onBack, onRefresh }: CardsListViewProps) {
  const { cards } = useBanking();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <Button variant="subtle" onClick={onBack}>
          ← Back to Overview
        </Button>
        <Button color="violet" onClick={() => setCreateModalOpen(true)}>
          ✨ Create Card
        </Button>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text fw={600} mb="md">Cards</Text>
        {cards.length > 0 ? (
          <div className="flex flex-col gap-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex justify-between items-center p-3 rounded border cursor-pointer hover:bg-gray-50"
                onClick={() => onNavigate({ view: 'card_detail', cardId: card.id })}
              >
                <div className="flex flex-col">
                  <Text fw={500} ff="monospace">•••• {card.last4}</Text>
                  {card.description && (
                    <Text size="sm" c="dimmed">{card.description}</Text>
                  )}
                  <Text size="xs" c="dimmed">{formatDate(card.created_at)}</Text>
                </div>
                <Badge variant="light" color={getStatusColor(card.status)}>
                  {card.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <Text c="dimmed" size="sm">No cards created yet</Text>
        )}
      </Card>

      <CreateCardModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        session={session}
        onSuccess={onRefresh}
      />
    </div>
  );
}
