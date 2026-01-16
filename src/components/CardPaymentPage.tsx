import { useState, useEffect } from 'react';
import { Card, Text, Button, Loader } from '@mantine/core';
import type { BillPayment, DemoSessionConfig } from '../types';

interface CardPaymentPageProps {
  payment: BillPayment;
  config: DemoSessionConfig;
  onBack: () => void;
}

interface IframeResponse {
  iframe_url: string;
  expires_at: string;
}

export function CardPaymentPage({ payment, config, onBack }: CardPaymentPageProps) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIframeUrl() {
      if (!payment.cardId) {
        setError('No card ID available');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${window.location.origin}/api/cards/${payment.cardId}/create_details_iframe`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to create iframe: ${response.status}`);
        }

        const data: IframeResponse = await response.json();
        setIframeUrl(data.iframe_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card details');
      } finally {
        setIsLoading(false);
      }
    }

    fetchIframeUrl();
  }, [payment.cardId, config.apiKey]);

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <Card shadow="md" padding="xl" radius="md" withBorder className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <Text size="lg" fw={600} mb="xs">
              {config.endUserName} has sent you a payment via single-use virtual card.
            </Text>
            <Text size="xl" fw={700} c="blue">
              Charge this card: {formatAmount(payment.amount)}
            </Text>
          </div>

          <div className="flex justify-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader size="md" />
                <Text size="sm" c="dimmed">Loading card details...</Text>
              </div>
            )}

            {error && (
              <Text c="red" size="sm" ta="center">
                {error}
              </Text>
            )}

            {iframeUrl && (
              <iframe
                src={iframeUrl}
                style={{ width: 312, height: 200, border: 'none' }}
                allow="clipboard-write"
                title="Card Details"
              />
            )}
          </div>

          <Button variant="subtle" onClick={onBack} className="mt-4">
            ← Back to Demo
          </Button>
        </div>
      </Card>
    </div>
  );
}
