import { useState } from 'react';
import { Card, Text, Button, Menu, Badge, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import { SimulateInboundModal } from './SimulateInboundModal';
import type { DemoSession, BankingViewState, InboundTransferType } from '../types';

interface BankingOverviewProps {
  session: DemoSession;
  onNavigate: (state: BankingViewState) => void;
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

export function BankingOverview({ session, onNavigate, onRefresh }: BankingOverviewProps) {
  const { account, balance, accountNumbers, lockboxes, transactions, cards, rollAccountNumber, rollLockbox } = useBanking();
  const { addRequest } = useApiLog();
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [simulateType, setSimulateType] = useState<InboundTransferType>('wire');
  const [isRollingAccountNumber, setIsRollingAccountNumber] = useState(false);
  const [isRollingLockbox, setIsRollingLockbox] = useState(false);

  // Use context data if available, otherwise fall back to session data from setup
  const primaryAccountNumber = accountNumbers[0] || session.accountNumber;
  const primaryLockbox = lockboxes[0] || session.lockbox;
  const displayCards = cards.length > 0 ? cards.slice(0, 3) : (session.cards || []).slice(0, 3);
  const recentTransactions = transactions.slice(0, 10);

  const handleSimulate = (type: InboundTransferType) => {
    setSimulateType(type);
    setSimulateModalOpen(true);
  };

  const handleRollAccountNumber = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRollingAccountNumber(true);
    try {
      await rollAccountNumber(session.config.apiKey, session.account.id, addRequest);
    } finally {
      setIsRollingAccountNumber(false);
    }
  };

  const handleRollLockbox = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRollingLockbox(true);
    try {
      await rollLockbox(session.config.apiKey, session.account.id, addRequest);
    } finally {
      setIsRollingLockbox(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Account Details Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {/* Header with name and balance */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b">
          <div>
            <Text size="sm" c="dimmed">Account</Text>
            <Text size="xl" fw={700}>{account?.name || 'Operating Account'}</Text>
          </div>
          <div className="text-right">
            <Text size="sm" c="dimmed">Available Balance</Text>
            <Text size="xl" fw={700} c="green">
              {balance ? formatCurrency(balance.available_balance) : '$0.00'}
            </Text>
          </div>
        </div>

        {/* Account Number, Lockbox, and Cards in three columns */}
        <div className="grid grid-cols-3 gap-6">
          {/* Account Number */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" fw={600} c="dimmed">Account Number</Text>
              <Button
                color="blue"
                size="compact-xs"
                variant="light"
                loading={isRollingAccountNumber}
                onClick={handleRollAccountNumber}
              >
                ↻ Roll
              </Button>
            </div>
            {primaryAccountNumber ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Text size="xs" c="dimmed" w={50}>Routing:</Text>
                  <Text size="sm" ff="monospace">{primaryAccountNumber.routing_number}</Text>
                  <CopyButton value={primaryAccountNumber.routing_number}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon variant="subtle" size="xs" onClick={copy}>
                          {copied ? '✓' : '📋'}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </div>
                <div className="flex items-center gap-1">
                  <Text size="xs" c="dimmed" w={50}>Account:</Text>
                  <Text size="sm" ff="monospace">{primaryAccountNumber.account_number}</Text>
                  <CopyButton value={primaryAccountNumber.account_number}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon variant="subtle" size="xs" onClick={copy}>
                          {copied ? '✓' : '📋'}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </div>
              </div>
            ) : (
              <Text c="dimmed" size="sm">No account number</Text>
            )}
          </div>

          {/* Lockbox */}
          <div
            className="cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
            onClick={() => onNavigate({ view: 'lockbox_detail' })}
          >
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" fw={600} c="dimmed">Lockbox</Text>
              <Button
                color="blue"
                size="compact-xs"
                variant="light"
                loading={isRollingLockbox}
                onClick={handleRollLockbox}
              >
                ↻ Roll
              </Button>
            </div>
            {primaryLockbox ? (
              <div className="flex flex-col">
                <Text size="sm">{primaryLockbox.address?.recipient_name}</Text>
                <Text size="sm" c="dimmed">{primaryLockbox.address?.line1}</Text>
                {primaryLockbox.address?.line2 && (
                  <Text size="sm" c="dimmed">{primaryLockbox.address.line2}</Text>
                )}
                <Text size="sm" c="dimmed">
                  {primaryLockbox.address?.city}, {primaryLockbox.address?.state} {primaryLockbox.address?.postal_code}
                </Text>
              </div>
            ) : (
              <Text c="dimmed" size="sm">No lockbox</Text>
            )}
          </div>

          {/* Cards */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" fw={600} c="dimmed">Cards</Text>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => onNavigate({ view: 'cards_list' })}
              >
                View All →
              </Button>
            </div>
            {displayCards.length > 0 ? (
              <div className="flex flex-col gap-1">
                {displayCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1"
                    onClick={() => onNavigate({ view: 'card_detail', cardId: card.id })}
                  >
                    <Text size="sm" ff="monospace">•••• {card.last4}</Text>
                    <Text size="xs" c="dimmed" truncate>{card.description}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text c="dimmed" size="sm">No cards yet</Text>
            )}
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex justify-between items-center mb-3">
          <Text fw={600}>Recent Transactions</Text>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button color="violet" size="xs" leftSection="✨">
                Simulate Receiving
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => handleSimulate('wire')}>
                Wire Transfer
              </Menu.Item>
              <Menu.Item onClick={() => handleSimulate('ach')}>
                ACH Transfer
              </Menu.Item>
              <Menu.Item onClick={() => handleSimulate('check')}>
                Check Deposit
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex justify-between items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => onNavigate({ view: 'transaction_detail', transactionId: txn.id })}
              >
                <div className="flex flex-col">
                  <Text size="sm" fw={500}>{txn.description}</Text>
                  <Text size="xs" c="dimmed">{formatDate(txn.created_at)}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <Text
                    size="sm"
                    fw={600}
                    c={txn.amount >= 0 ? 'green' : 'red'}
                    ff="monospace"
                  >
                    {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                  </Text>
                  <Badge variant="light" size="xs">
                    {txn.source?.category?.replace(/_/g, ' ') || 'unknown'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text c="dimmed" size="sm">No transactions yet</Text>
        )}
      </Card>

      {/* Simulate Modal */}
      <SimulateInboundModal
        opened={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        type={simulateType}
        session={session}
        onSuccess={onRefresh}
      />
    </div>
  );
}
