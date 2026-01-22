import { useState } from 'react';
import { Modal, TextInput, Button } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession } from '../types';

interface CreateCardModalProps {
  opened: boolean;
  onClose: () => void;
  session: DemoSession;
  onSuccess: () => void;
}

export function CreateCardModal({ opened, onClose, session, onSuccess }: CreateCardModalProps) {
  const { createCard } = useBanking();
  const { addRequest } = useApiLog();
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await createCard(
        session.config.apiKey,
        session.account.id,
        description || 'Virtual Card',
        addRequest
      );
      setDescription('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    onClose();
  };

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

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} color="violet">
            ✨ Create Card
          </Button>
        </div>
      </form>
    </Modal>
  );
}
