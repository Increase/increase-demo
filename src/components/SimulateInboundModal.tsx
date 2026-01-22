import { useState } from 'react';
import { Modal, NumberInput, TextInput, Button, Text } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession, InboundTransferType } from '../types';

interface SimulateInboundModalProps {
  opened: boolean;
  onClose: () => void;
  type: InboundTransferType;
  session: DemoSession;
  onSuccess: () => void;
}

const TYPE_LABELS: Record<InboundTransferType, string> = {
  wire: 'Wire Transfer',
  ach: 'ACH Transfer',
  check: 'Check Deposit',
};

export function SimulateInboundModal({
  opened,
  onClose,
  type,
  session,
  onSuccess,
}: SimulateInboundModalProps) {
  const { accountNumbers, simulateInbound } = useBanking();
  const { addRequest } = useApiLog();
  const [amount, setAmount] = useState<number | ''>(1000);
  const [checkNumber, setCheckNumber] = useState('1001');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use context data if available, otherwise fall back to session data
  const primaryAccountNumber = accountNumbers[0] || session.accountNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!primaryAccountNumber) {
      setError('No account number available');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await simulateInbound(
        session.config.apiKey,
        primaryAccountNumber.id,
        amount * 100, // Convert dollars to cents
        type,
        type === 'check' ? checkNumber : undefined,
        addRequest
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to simulate transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(1000);
    setCheckNumber('1001');
    setError(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={`Simulate ${TYPE_LABELS[type]}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Text size="sm" c="dimmed">
          Simulate receiving an inbound {TYPE_LABELS[type].toLowerCase()} to your account.
        </Text>

        <NumberInput
          label="Amount"
          placeholder="Enter amount"
          value={amount}
          onChange={(val) => setAmount(typeof val === 'number' ? val : '')}
          min={1}
          prefix="$"
          decimalScale={2}
          disabled={isLoading}
          required
        />

        {type === 'check' && (
          <TextInput
            label="Check Number"
            placeholder="Enter check number"
            value={checkNumber}
            onChange={(e) => setCheckNumber(e.currentTarget.value)}
            disabled={isLoading}
            required
          />
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} color="violet">
            ✨ Simulate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
