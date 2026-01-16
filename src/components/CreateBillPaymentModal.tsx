import { useState } from 'react';
import { Modal, Button, TextInput, NumberInput, Select, Radio, Group, Text } from '@mantine/core';
import type { PaymentNetwork, PaymentDetails } from '../types';
import type Increase from 'increase';

interface CreateBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (externalAccountId: string, amount: number, paymentDetails: PaymentDetails) => Promise<void>;
  externalAccounts: Increase.ExternalAccount[];
}

const DUMMY_ACH_DETAILS = {
  accountNumber: '123456789',
  routingNumber: '101050001',
  statementDescriptor: 'VENDOR PAYMENT',
};

const DUMMY_CHECK_DETAILS = {
  recipientName: 'Acme Supplies Inc',
  addressLine1: '456 Commerce Street',
  addressLine2: 'Suite 100',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90012',
  memo: 'Invoice #12345',
};

export function CreateBillPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  externalAccounts,
}: CreateBillPaymentModalProps) {
  const [externalAccountId, setExternalAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | number>('');
  const [network, setNetwork] = useState<PaymentNetwork>('ach');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ACH/RTP/Wire fields
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [statementDescriptor, setStatementDescriptor] = useState('');

  // Check fields
  const [recipientName, setRecipientName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [memo, setMemo] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'usps' | 'fedex'>('usps');

  // Card fields
  const [cardDescription, setCardDescription] = useState('');

  const fillDummyDetails = () => {
    if (network === 'check') {
      setRecipientName(DUMMY_CHECK_DETAILS.recipientName);
      setAddressLine1(DUMMY_CHECK_DETAILS.addressLine1);
      setAddressLine2(DUMMY_CHECK_DETAILS.addressLine2);
      setCity(DUMMY_CHECK_DETAILS.city);
      setState(DUMMY_CHECK_DETAILS.state);
      setZip(DUMMY_CHECK_DETAILS.zip);
      setMemo(DUMMY_CHECK_DETAILS.memo);
    } else if (network === 'card') {
      setCardDescription('Single-use card for Invoice #12345');
    } else {
      setAccountNumber(DUMMY_ACH_DETAILS.accountNumber);
      setRoutingNumber(DUMMY_ACH_DETAILS.routingNumber);
      setStatementDescriptor(DUMMY_ACH_DETAILS.statementDescriptor);
    }
  };

  const resetForm = () => {
    setExternalAccountId(null);
    setAmount('');
    setNetwork('ach');
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
    setShippingMethod('usps');
    setCardDescription('');
    setError(null);
  };

  const handleSubmit = async () => {
    const amountCents = Math.round(Number(amount) * 100);
    if (!externalAccountId || isNaN(amountCents) || amountCents <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    let paymentDetails: PaymentDetails;

    if (network === 'check') {
      if (!recipientName || !addressLine1 || !city || !state || !zip) {
        setError('Please fill in all check details');
        return;
      }
      paymentDetails = {
        network: 'check',
        recipientName,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        memo,
        shippingMethod,
      };
    } else if (network === 'card') {
      if (!cardDescription) {
        setError('Please fill in the card description');
        return;
      }
      paymentDetails = {
        network: 'card',
        description: cardDescription,
      };
    } else {
      if (!accountNumber || !routingNumber || !statementDescriptor) {
        setError('Please fill in all payment details');
        return;
      }
      paymentDetails = {
        network,
        accountNumber,
        routingNumber,
        statementDescriptor,
      } as PaymentDetails;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(externalAccountId, amountCents, paymentDetails);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const externalAccountOptions = externalAccounts.map((acc) => ({
    value: acc.id,
    label: `${acc.description} (${acc.routing_number} / ${acc.account_number})`,
  }));

  return (
    <Modal opened={isOpen} onClose={handleClose} title="Create Bill Payment" size="lg">
      <div className="flex flex-col gap-4">
        {/* External Account Selection */}
        <Select
          label="Funding Source (External Account)"
          data={externalAccountOptions}
          value={externalAccountId}
          onChange={setExternalAccountId}
          disabled={isLoading}
        />

        {/* Amount */}
        <NumberInput
          label="Amount ($)"
          placeholder="0.00"
          value={amount}
          onChange={setAmount}
          disabled={isLoading}
          prefix="$"
          decimalScale={2}
          min={0}
        />

        {/* Payment Network */}
        <Radio.Group
          label="Payment Method"
          value={network}
          onChange={(val) => setNetwork(val as PaymentNetwork)}
        >
          <Group mt="xs">
            <Radio value="ach" label="ACH" disabled={isLoading} />
            <Radio value="rtp" label="RTP" disabled={isLoading} />
            <Radio value="wire" label="Wire" disabled={isLoading} />
            <Radio value="check" label="Check" disabled={isLoading} />
            <Radio value="card" label="Card" disabled={isLoading} />
          </Group>
        </Radio.Group>

        {/* Network-specific fields */}
        <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <Text size="sm" fw={500}>
              {network === 'check' ? 'Check Details' : network === 'card' ? 'Card Details' : 'Recipient Bank Details'}
            </Text>
            <Button size="xs" color="violet" onClick={fillDummyDetails}>
              ✨ Fill Demo Data
            </Button>
          </div>

          {network === 'card' ? (
            <>
              <TextInput
                label="Card Description"
                size="sm"
                placeholder="e.g., Single-use card for Invoice #12345"
                value={cardDescription}
                onChange={(e) => setCardDescription(e.currentTarget.value)}
                disabled={isLoading}
              />
              <Text size="xs" c="dimmed">
                A virtual card will be created with a spend limit of the payment amount.
                The payment completes when the card is authorized.
              </Text>
            </>
          ) : network === 'check' ? (
            <>
              <TextInput
                label="Recipient Name"
                size="sm"
                value={recipientName}
                onChange={(e) => setRecipientName(e.currentTarget.value)}
                disabled={isLoading}
              />
              <TextInput
                label="Address Line 1"
                size="sm"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.currentTarget.value)}
                disabled={isLoading}
              />
              <TextInput
                label="Address Line 2"
                size="sm"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.currentTarget.value)}
                disabled={isLoading}
              />
              <div className="grid grid-cols-3 gap-2">
                <TextInput
                  label="City"
                  size="sm"
                  value={city}
                  onChange={(e) => setCity(e.currentTarget.value)}
                  disabled={isLoading}
                />
                <TextInput
                  label="State"
                  size="sm"
                  value={state}
                  onChange={(e) => setState(e.currentTarget.value)}
                  disabled={isLoading}
                />
                <TextInput
                  label="ZIP"
                  size="sm"
                  value={zip}
                  onChange={(e) => setZip(e.currentTarget.value)}
                  disabled={isLoading}
                />
              </div>
              <TextInput
                label="Memo"
                size="sm"
                value={memo}
                onChange={(e) => setMemo(e.currentTarget.value)}
                disabled={isLoading}
              />
              <Radio.Group
                label="Shipping Method"
                value={shippingMethod}
                onChange={(val) => setShippingMethod(val as 'usps' | 'fedex')}
                size="sm"
              >
                <Group mt="xs">
                  <Radio value="usps" label="USPS" disabled={isLoading} />
                  <Radio value="fedex" label="FedEx" disabled={isLoading} />
                </Group>
              </Radio.Group>
            </>
          ) : (
            <>
              <TextInput
                label="Account Number"
                size="sm"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.currentTarget.value)}
                disabled={isLoading}
              />
              <TextInput
                label="Routing Number"
                size="sm"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.currentTarget.value)}
                disabled={isLoading}
              />
              <TextInput
                label="Statement Descriptor"
                size="sm"
                value={statementDescriptor}
                onChange={(e) => setStatementDescriptor(e.currentTarget.value)}
                disabled={isLoading}
              />
            </>
          )}
        </div>

        {error && <Text c="red" size="sm">{error}</Text>}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isLoading}>
            Create Payment
          </Button>
        </Group>
      </div>
    </Modal>
  );
}
