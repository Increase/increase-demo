import { useState } from 'react';
import { Card, TextInput, PasswordInput, Button, Select } from '@mantine/core';
import { setupDemoSession } from '../lib/increase';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession, Product } from '../types';

const PRODUCTS: { value: Product; label: string }[] = [
  { value: 'bill_pay', label: 'Bill Pay' },
];

interface SetupScreenProps {
  onSessionCreated: (session: DemoSession) => void;
}

export function SetupScreen({ onSessionCreated }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_INCREASE_API_KEY ?? '');
  const [companyName, setCompanyName] = useState(import.meta.env.VITE_COMPANY_NAME ?? '');
  const [product, setProduct] = useState<Product>('bill_pay');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addRequest } = useApiLog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !companyName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = { apiKey, companyName, product };
      const sessionData = await setupDemoSession(config, addRequest);
      onSessionCreated({
        config,
        ...sessionData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create demo session');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = apiKey.trim() && companyName.trim();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card shadow="sm" padding="lg" radius="md" withBorder className="w-full max-w-md">
        <div className="flex flex-col gap-1 mb-4">
          <h1 className="text-2xl font-bold">Increase API Demo</h1>
          <p className="text-gray-500 text-sm">
            Configure your demo session
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordInput
            label="API Key"
            placeholder="Enter your Increase sandbox API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            disabled={isLoading}
          />
          <TextInput
            label="Company Name"
            placeholder="Enter company name for the demo"
            value={companyName}
            onChange={(e) => setCompanyName(e.currentTarget.value)}
            disabled={isLoading}
          />
          <Select
            label="Product"
            data={PRODUCTS}
            value={product}
            onChange={(value) => value && setProduct(value as Product)}
            disabled={isLoading}
          />
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <Button
            type="submit"
            loading={isLoading}
            disabled={!isFormValid}
          >
            {isLoading ? 'Creating Demo Session...' : 'Create Demo Session'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
