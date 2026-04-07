import { useState } from 'react';
import { Modal, Button, TextInput, NumberInput, Radio, Group, Text } from '@mantine/core';
import { useBanking } from '../context/BankingContext';
import { useApiLog } from '../context/ApiLogContext';
import type { DemoSession, OutboundTransferNetwork } from '../types';

interface MoveMoneyModalProps {
  opened: boolean;
  onClose: () => void;
  session: DemoSession;
  onSuccess: () => void;
}

const DUMMY_ACH = {
  accountNumber: '987654321',
  routingNumber: '101050001',
  statementDescriptor: 'VENDOR PAYMENT',
};

const DUMMY_WIRE = {
  accountNumber: '987654321',
  routingNumber: '101050001',
  recipientName: 'Acme Supplies Inc',
  statementDescriptor: 'Invoice #4821',
};

const DUMMY_RTP = {
  accountNumber: '987654321',
  routingNumber: '101050001',
  recipientName: 'Cloud Services LLC',
  statementDescriptor: 'Monthly subscription',
};

const DUMMY_CHECK = {
  recipientName: 'Acme Supplies Inc',
  addressLine1: '456 Commerce Blvd',
  addressLine2: 'Suite 200',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  memo: 'Invoice #4821',
};

export function MoveMoneyModal({ opened, onClose, session, onSuccess }: MoveMoneyModalProps) {
  const { accountNumbers, sendTransfer } = useBanking();
  const { addRequest } = useApiLog();

  const [network, setNetwork] = useState<OutboundTransferNetwork>('ach');
  const [amount, setAmount] = useState<number | ''>('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [statementDescriptor, setStatementDescriptor] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryAccountNumber = accountNumbers[0] || session.accountNumber;

  const isFormEmpty = !amount && !accountNumber && !routingNumber && !statementDescriptor
    && !recipientName && !addressLine1 && !city && !state && !zip && !memo;

  const handleAutofill = () => {
    setAmount(1500);
    if (network === 'ach') {
      setAccountNumber(DUMMY_ACH.accountNumber);
      setRoutingNumber(DUMMY_ACH.routingNumber);
      setStatementDescriptor(DUMMY_ACH.statementDescriptor);
    } else if (network === 'wire') {
      setAccountNumber(DUMMY_WIRE.accountNumber);
      setRoutingNumber(DUMMY_WIRE.routingNumber);
      setRecipientName(DUMMY_WIRE.recipientName);
      setStatementDescriptor(DUMMY_WIRE.statementDescriptor);
    } else if (network === 'rtp') {
      setAccountNumber(DUMMY_RTP.accountNumber);
      setRoutingNumber(DUMMY_RTP.routingNumber);
      setRecipientName(DUMMY_RTP.recipientName);
      setStatementDescriptor(DUMMY_RTP.statementDescriptor);
    } else if (network === 'check') {
      setRecipientName(DUMMY_CHECK.recipientName);
      setAddressLine1(DUMMY_CHECK.addressLine1);
      setAddressLine2(DUMMY_CHECK.addressLine2);
      setCity(DUMMY_CHECK.city);
      setState(DUMMY_CHECK.state);
      setZip(DUMMY_CHECK.zip);
      setMemo(DUMMY_CHECK.memo);
    }
  };

  const resetForm = () => {
    setNetwork('ach');
    setAmount('');
    setAccountNumber('');
    setRoutingNumber('');
    setStatementDescriptor('');
    setRecipientName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setZip('');
    setMemo('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

    if (network !== 'check' && (!accountNumber || !routingNumber)) {
      setError('Account number and routing number are required');
      return;
    }

    if (network === 'check' && (!recipientName || !addressLine1 || !city || !state || !zip)) {
      setError('Recipient name and full mailing address are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendTransfer(
        session.config.apiKey,
        session.account.id,
        primaryAccountNumber.id,
        network,
        amount * 100,
        {
          accountNumber,
          routingNumber,
          statementDescriptor,
          recipientName,
          addressLine1,
          addressLine2,
          city,
          state,
          zip,
          memo,
        },
        addRequest
      );
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const networkLabels: Record<OutboundTransferNetwork, string> = {
    ach: 'ACH',
    wire: 'Wire',
    rtp: 'RTP',
    check: 'Check',
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Move Money" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <Text size="sm" c="dimmed">
            Send funds from your account via {networkLabels[network]}.
          </Text>
          {isFormEmpty && (
            <Button
              variant="light"
              color="violet"
              size="xs"
              onClick={handleAutofill}
            >
              ✨ Fill with demo data
            </Button>
          )}
        </div>

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

        <Radio.Group
          label="Transfer Method"
          value={network}
          onChange={(val) => {
            setNetwork(val as OutboundTransferNetwork);
            setAccountNumber('');
            setRoutingNumber('');
            setStatementDescriptor('');
            setRecipientName('');
            setAddressLine1('');
            setAddressLine2('');
            setCity('');
            setState('');
            setZip('');
            setMemo('');
          }}
        >
          <Group mt="xs">
            <Radio value="ach" label="ACH" disabled={isLoading} />
            <Radio value="wire" label="Wire" disabled={isLoading} />
            <Radio value="rtp" label="RTP" disabled={isLoading} />
            <Radio value="check" label="Check" disabled={isLoading} />
          </Group>
        </Radio.Group>

        {network === 'check' ? (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-3">
            <Text size="sm" fw={500}>Mailing Details</Text>
            <TextInput
              label="Recipient Name"
              placeholder="Jane Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.currentTarget.value)}
              disabled={isLoading}
              required
            />
            <TextInput
              label="Address Line 1"
              placeholder="123 Main St"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.currentTarget.value)}
              disabled={isLoading}
              required
            />
            <TextInput
              label="Address Line 2"
              placeholder="Suite 200"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.currentTarget.value)}
              disabled={isLoading}
            />
            <div className="grid grid-cols-3 gap-3">
              <TextInput
                label="City"
                placeholder="New York"
                value={city}
                onChange={(e) => setCity(e.currentTarget.value)}
                disabled={isLoading}
                required
              />
              <TextInput
                label="State"
                placeholder="NY"
                value={state}
                onChange={(e) => setState(e.currentTarget.value)}
                disabled={isLoading}
                required
              />
              <TextInput
                label="ZIP"
                placeholder="10001"
                value={zip}
                onChange={(e) => setZip(e.currentTarget.value)}
                disabled={isLoading}
                required
              />
            </div>
            <TextInput
              label="Memo"
              placeholder="Invoice #1234"
              value={memo}
              onChange={(e) => setMemo(e.currentTarget.value)}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-3">
            <Text size="sm" fw={500}>Destination Details</Text>
            {(network === 'wire' || network === 'rtp') && (
              <TextInput
                label="Recipient Name"
                placeholder="Acme Corp"
                value={recipientName}
                onChange={(e) => setRecipientName(e.currentTarget.value)}
                disabled={isLoading}
                required
              />
            )}
            <TextInput
              label="Account Number"
              placeholder="123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.currentTarget.value)}
              disabled={isLoading}
              required
            />
            <TextInput
              label="Routing Number"
              placeholder="101050001"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.currentTarget.value)}
              disabled={isLoading}
              required
            />
            <TextInput
              label={network === 'wire' ? 'Message to Recipient' : 'Statement Descriptor'}
              placeholder={network === 'wire' ? 'Invoice #1234' : 'PAYMENT'}
              value={statementDescriptor}
              onChange={(e) => setStatementDescriptor(e.currentTarget.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {error && (
          <Text c="red" size="sm">{error}</Text>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Send {networkLabels[network]} Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
