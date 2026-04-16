import { useState } from 'react';
import { Modal, TextInput, Button, SegmentedControl, Select, NumberInput } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession } from '../types';

interface CreateCardModalProps {
  opened: boolean;
  onClose: () => void;
  session: DemoSession;
  onSuccess: () => void;
}

type UsageCategory = 'multi_use' | 'single_use';
type SpendingInterval = 'all_time' | 'per_transaction' | 'per_day' | 'per_week' | 'per_month';

const intervalOptions = [
  { value: 'per_transaction', label: 'Per transaction' },
  { value: 'per_day', label: 'Per day' },
  { value: 'per_week', label: 'Per week' },
  { value: 'per_month', label: 'Per month' },
  { value: 'all_time', label: 'All time' },
];

export function CreateCardModal({ opened, onClose, session, onSuccess }: CreateCardModalProps) {
  const { createCard } = useBanking();
  const { addRequest } = useApiLog();
  const [description, setDescription] = useState('');
  const [usageCategory, setUsageCategory] = useState<UsageCategory>('multi_use');
  const [singleUseAmount, setSingleUseAmount] = useState<number | string>('');
  const [spendingInterval, setSpendingInterval] = useState<SpendingInterval>('per_month');
  const [spendingLimit, setSpendingLimit] = useState<number | string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const authorizationControls: Parameters<typeof createCard>[5] = {
        usage: usageCategory === 'single_use'
          ? {
              category: 'single_use',
              single_use: {
                settlement_amount: {
                  comparison: 'less_than_or_equals',
                  value: Math.round(Number(singleUseAmount) * 100),
                },
              },
            }
          : {
              category: 'multi_use',
              ...(spendingLimit !== '' && {
                multi_use: {
                  spending_limits: [
                    {
                      interval: spendingInterval,
                      settlement_amount: Math.round(Number(spendingLimit) * 100),
                    },
                  ],
                },
              }),
            },
      };

      await createCard(
        session.config.apiKey,
        session.account.id,
        description || 'Virtual Card',
        addRequest,
        authorizationControls
      );
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setUsageCategory('multi_use');
    setSingleUseAmount('');
    setSpendingInterval('per_month');
    setSpendingLimit('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isSubmitDisabled = usageCategory === 'single_use' && (singleUseAmount === '' || Number(singleUseAmount) <= 0);

  return (
    <Modal opened={opened} onClose={handleClose} title="Create Card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Description"
          placeholder="Enter card description (optional)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          disabled={isLoading}
        />

        <div>
          <label className="text-sm font-medium mb-1 block">Usage</label>
          <SegmentedControl
            fullWidth
            value={usageCategory}
            onChange={(val) => setUsageCategory(val as UsageCategory)}
            data={[
              { label: 'Multi-use', value: 'multi_use' },
              { label: 'Single-use', value: 'single_use' },
            ]}
            disabled={isLoading}
          />
        </div>

        {usageCategory === 'single_use' ? (
          <NumberInput
            label="Amount limit"
            description="Maximum settlement amount for this card"
            placeholder="0.00"
            prefix="$"
            decimalScale={2}
            fixedDecimalScale
            min={0.01}
            value={singleUseAmount}
            onChange={setSingleUseAmount}
            disabled={isLoading}
          />
        ) : (
          <div className="flex gap-3">
            <Select
              label="Spending limit interval"
              className="flex-1"
              value={spendingInterval}
              onChange={(val) => val && setSpendingInterval(val as SpendingInterval)}
              data={intervalOptions}
              disabled={isLoading}
            />
            <NumberInput
              label="Limit amount"
              className="flex-1"
              placeholder="No limit"
              prefix="$"
              decimalScale={2}
              fixedDecimalScale
              min={0.01}
              value={spendingLimit}
              onChange={setSpendingLimit}
              disabled={isLoading}
            />
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} color="violet" disabled={isSubmitDisabled}>
            ✨ Create Card
          </Button>
        </div>
      </form>
    </Modal>
  );
}
