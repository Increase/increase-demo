import { useState, useEffect } from 'react';
import { Title, Text } from '@mantine/core';
import type { DemoSession, PaymentDetails } from '../types';
import { useBillPayments } from '../context/BillPaymentContext';
import { useApiLog } from '../context/ApiLogContext';
import { BillPaymentList } from './BillPaymentList';
import { BillPaymentDetail } from './BillPaymentDetail';
import { CreateBillPaymentModal } from './CreateBillPaymentModal';

interface BillPayViewProps {
  session: DemoSession;
}

export function BillPayView({ session }: BillPayViewProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { payments, createPayment, settleDebitAndCreateCredit, settleCreditTransfer, simulateCardAuthorization } = useBillPayments();
  const { addRequest } = useApiLog();

  const externalAccounts = session.externalAccount ? [session.externalAccount] : [];

  // Find selected payment from current payments list to get updated state
  const selectedPayment = selectedPaymentId
    ? payments.find((p) => p.id === selectedPaymentId) || null
    : null;

  // Clear selection if payment no longer exists
  useEffect(() => {
    if (selectedPaymentId && !payments.find((p) => p.id === selectedPaymentId)) {
      setSelectedPaymentId(null);
    }
  }, [payments, selectedPaymentId]);

  const handleCreatePayment = async (
    externalAccountId: string,
    amount: number,
    paymentDetails: PaymentDetails
  ) => {
    await createPayment(
      session.config.apiKey,
      session.account.id,
      externalAccountId,
      amount,
      paymentDetails,
      addRequest
    );
  };

  const handleSettleAndPay = async (paymentId: string) => {
    await settleDebitAndCreateCredit(
      session.config.apiKey,
      paymentId,
      session.account.id,
      addRequest
    );
  };

  const handleSettleCredit = async (paymentId: string) => {
    await settleCreditTransfer(
      session.config.apiKey,
      paymentId,
      addRequest
    );
  };

  const handleSimulateCardAuth = async (paymentId: string) => {
    await simulateCardAuthorization(
      session.config.apiKey,
      paymentId,
      addRequest
    );
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-6">
        <Title order={2}>{session.config.companyName}</Title>
        <Text c="dimmed">Bill Pay</Text>
      </div>

      {selectedPayment ? (
        <BillPaymentDetail
          payment={selectedPayment}
          onBack={() => setSelectedPaymentId(null)}
          onSettleAndPay={handleSettleAndPay}
          onSettleCredit={handleSettleCredit}
          onSimulateCardAuth={handleSimulateCardAuth}
        />
      ) : (
        <BillPaymentList
          payments={payments}
          onSelect={(payment) => setSelectedPaymentId(payment.id)}
          onCreateNew={() => setIsModalOpen(true)}
        />
      )}

      <CreateBillPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePayment}
        externalAccounts={externalAccounts}
      />
    </div>
  );
}
