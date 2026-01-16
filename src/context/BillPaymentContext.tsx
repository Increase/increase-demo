import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { BillPayment, PaymentDetails, ApiRequest } from '../types';
import { createIncreaseClient } from '../lib/increase';

interface BillPaymentContextType {
  payments: BillPayment[];
  createPayment: (
    apiKey: string,
    accountId: string,
    externalAccountId: string,
    amount: number,
    paymentDetails: PaymentDetails,
    logFn: (req: ApiRequest) => void
  ) => Promise<BillPayment>;
  settleDebitAndCreateCredit: (
    apiKey: string,
    paymentId: string,
    accountId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  settleCreditTransfer: (
    apiKey: string,
    paymentId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  simulateCardAuthorization: (
    apiKey: string,
    paymentId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  updatePayment: (id: string, updates: Partial<BillPayment>) => void;
}

const BillPaymentContext = createContext<BillPaymentContextType | null>(null);

export function BillPaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<BillPayment[]>([]);

  const updatePayment = useCallback((id: string, updates: Partial<BillPayment>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const createPayment = useCallback(
    async (
      apiKey: string,
      accountId: string,
      externalAccountId: string,
      amount: number,
      paymentDetails: PaymentDetails,
      logFn: (req: ApiRequest) => void
    ): Promise<BillPayment> => {
      const client = createIncreaseClient(apiKey);
      const paymentId = crypto.randomUUID();

      const payment: BillPayment = {
        id: paymentId,
        createdAt: new Date(),
        amount,
        status: 'pending_debit',
        externalAccountId,
        paymentDetails,
      };

      setPayments((prev) => [...prev, payment]);

      try {
        // Only create the debit leg - credit leg comes after settlement
        // Negative amount with external_account_id pulls FROM the external account
        const debitTransfer = await client.achTransfers.create({
          account_id: accountId,
          amount: -amount,
          external_account_id: externalAccountId,
          statement_descriptor: 'Bill Payment Debit',
        });

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'ach_transfers',
          status: 200,
          resourceType: 'ach_transfers',
          resourceId: debitTransfer.id,
          timestamp: new Date(),
        });

        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId
              ? { ...p, status: 'debit_processing', debitTransferId: debitTransfer.id }
              : p
          )
        );

        return { ...payment, status: 'debit_processing', debitTransferId: debitTransfer.id };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'failed', error: errorMessage } : p
          )
        );

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'ach_transfers',
          status: 500,
          resourceType: 'ach_transfers',
          timestamp: new Date(),
        });

        throw error;
      }
    },
    []
  );

  const settleDebitAndCreateCredit = useCallback(
    async (
      apiKey: string,
      paymentId: string,
      accountId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);
      const payment = payments.find((p) => p.id === paymentId);

      if (!payment || !payment.debitTransferId) {
        throw new Error('Payment not found or debit not created');
      }

      try {
        // Step 1: Simulate settling the ACH debit transfer
        await client.simulations.achTransfers.settle(payment.debitTransferId, {});

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: `simulations/ach_transfers/${payment.debitTransferId}/settle`,
          status: 200,
          resourceType: 'simulations',
          resourceId: payment.debitTransferId,
          timestamp: new Date(),
        });

        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'pending_credit' } : p
          )
        );

        // Step 2: Create credit leg based on payment network
        let creditTransferId: string | undefined;
        const paymentDetails = payment.paymentDetails;

        if (paymentDetails.network === 'ach') {
          const creditTransfer = await client.achTransfers.create({
            account_id: accountId,
            amount: payment.amount,
            routing_number: paymentDetails.routingNumber,
            account_number: paymentDetails.accountNumber,
            statement_descriptor: paymentDetails.statementDescriptor,
          });
          creditTransferId = creditTransfer.id;

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'ach_transfers',
            status: 200,
            resourceType: 'ach_transfers',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          // Simulate ACH submission
          await client.simulations.achTransfers.submit(creditTransfer.id);

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: `simulations/ach_transfers/${creditTransfer.id}/submit`,
            status: 200,
            resourceType: 'simulations',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          setPayments((prev) =>
            prev.map((p) =>
              p.id === paymentId
                ? { ...p, status: 'credit_submitted', creditTransferId }
                : p
            )
          );
        } else if (paymentDetails.network === 'wire') {
          const creditTransfer = await client.wireTransfers.create({
            account_id: accountId,
            amount: payment.amount,
            routing_number: paymentDetails.routingNumber,
            account_number: paymentDetails.accountNumber,
            creditor: { name: paymentDetails.statementDescriptor },
            remittance: {
              category: 'unstructured',
              unstructured: { message: paymentDetails.statementDescriptor },
            },
          });
          creditTransferId = creditTransfer.id;

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'wire_transfers',
            status: 200,
            resourceType: 'wire_transfers',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          // Simulate wire submission (instant)
          await client.simulations.wireTransfers.submit(creditTransfer.id);

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: `simulations/wire_transfers/${creditTransfer.id}/submit`,
            status: 200,
            resourceType: 'simulations',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          setPayments((prev) =>
            prev.map((p) =>
              p.id === paymentId
                ? { ...p, status: 'completed', creditTransferId }
                : p
            )
          );
        } else if (paymentDetails.network === 'rtp') {
          // RTP requires an Account Number - create one on demand
          const accountNumber = await client.accountNumbers.create({
            account_id: accountId,
            name: 'RTP Transfer',
          });

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'account_numbers',
            status: 200,
            resourceType: 'account_numbers',
            resourceId: accountNumber.id,
            timestamp: new Date(),
          });

          const creditTransfer = await client.realTimePaymentsTransfers.create({
            source_account_number_id: accountNumber.id,
            destination_account_number: paymentDetails.accountNumber,
            destination_routing_number: paymentDetails.routingNumber,
            amount: payment.amount,
            creditor_name: paymentDetails.statementDescriptor,
            remittance_information: paymentDetails.statementDescriptor,
          });
          creditTransferId = creditTransfer.id;

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'real_time_payments_transfers',
            status: 200,
            resourceType: 'real_time_payments_transfers',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          // Simulate RTP completion (instant)
          await client.simulations.realTimePaymentsTransfers.complete(creditTransfer.id, {});

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: `simulations/real_time_payments_transfers/${creditTransfer.id}/complete`,
            status: 200,
            resourceType: 'simulations',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          setPayments((prev) =>
            prev.map((p) =>
              p.id === paymentId
                ? { ...p, status: 'completed', creditTransferId }
                : p
            )
          );
        } else if (paymentDetails.network === 'check') {
          // Check requires an Account Number - create one on demand
          const accountNumber = await client.accountNumbers.create({
            account_id: accountId,
            name: 'Check Transfer',
          });

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'account_numbers',
            status: 200,
            resourceType: 'account_numbers',
            resourceId: accountNumber.id,
            timestamp: new Date(),
          });

          const creditTransfer = await client.checkTransfers.create({
            account_id: accountId,
            amount: payment.amount,
            source_account_number_id: accountNumber.id,
            fulfillment_method: 'physical_check',
            physical_check: {
              recipient_name: paymentDetails.recipientName,
              mailing_address: {
                name: paymentDetails.recipientName,
                line1: paymentDetails.addressLine1,
                line2: paymentDetails.addressLine2,
                city: paymentDetails.city,
                state: paymentDetails.state,
                postal_code: paymentDetails.zip,
              },
              memo: paymentDetails.memo,
            },
          });
          creditTransferId = creditTransfer.id;

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'check_transfers',
            status: 200,
            resourceType: 'check_transfers',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          // Simulate check being mailed
          await client.simulations.checkTransfers.mail(creditTransfer.id);

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: `simulations/check_transfers/${creditTransfer.id}/mail`,
            status: 200,
            resourceType: 'simulations',
            resourceId: creditTransfer.id,
            timestamp: new Date(),
          });

          setPayments((prev) =>
            prev.map((p) =>
              p.id === paymentId
                ? {
                    ...p,
                    status: 'credit_mailed',
                    creditTransferId,
                    checkNumber: creditTransfer.check_number,
                    sourceAccountNumberId: accountNumber.id,
                  }
                : p
            )
          );
        } else if (paymentDetails.network === 'card') {
          // Create a virtual card for this payment
          const card = await client.cards.create({
            account_id: accountId,
            description: paymentDetails.description,
          });

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'cards',
            status: 200,
            resourceType: 'cards',
            resourceId: card.id,
            timestamp: new Date(),
          });

          // Card is immediately available - set status to pending authorization
          setPayments((prev) =>
            prev.map((p) =>
              p.id === paymentId
                ? {
                    ...p,
                    status: 'pending_authorization',
                    cardId: card.id,
                    cardLast4: card.last4,
                  }
                : p
            )
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'failed', error: errorMessage } : p
          )
        );
        throw error;
      }
    },
    [payments]
  );

  const settleCreditTransfer = useCallback(
    async (
      apiKey: string,
      paymentId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);
      const payment = payments.find((p) => p.id === paymentId);

      if (!payment || !payment.creditTransferId) {
        throw new Error('Payment not found or credit not created');
      }

      try {
        const paymentDetails = payment.paymentDetails;

        if (paymentDetails.network === 'ach') {
          // Settle ACH credit transfer
          await client.simulations.achTransfers.settle(payment.creditTransferId, {});

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: `simulations/ach_transfers/${payment.creditTransferId}/settle`,
            status: 200,
            resourceType: 'simulations',
            resourceId: payment.creditTransferId,
            timestamp: new Date(),
          });
        } else if (paymentDetails.network === 'check') {
          // Simulate the recipient depositing the check via Inbound Check Deposit
          if (!payment.sourceAccountNumberId || !payment.checkNumber) {
            throw new Error('Missing check details for deposit simulation');
          }

          const inboundCheckDeposit = await client.simulations.inboundCheckDeposits.create({
            account_number_id: payment.sourceAccountNumberId,
            amount: payment.amount,
            check_number: payment.checkNumber,
          });

          logFn({
            id: crypto.randomUUID(),
            method: 'POST',
            path: 'simulations/inbound_check_deposits',
            status: 200,
            resourceType: 'inbound_check_deposits',
            resourceId: inboundCheckDeposit.id,
            timestamp: new Date(),
          });
        }

        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'completed' } : p
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'failed', error: errorMessage } : p
          )
        );
        throw error;
      }
    },
    [payments]
  );

  const simulateCardAuthorization = useCallback(
    async (
      apiKey: string,
      paymentId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);
      const payment = payments.find((p) => p.id === paymentId);

      if (!payment || !payment.cardId) {
        throw new Error('Payment not found or card not created');
      }

      try {
        // Simulate a card authorization for the payment amount
        const result = await client.simulations.cardAuthorizations.create({
          card_id: payment.cardId,
          amount: payment.amount,
          merchant_descriptor: 'Bill Payment',
          merchant_category_code: '5999', // Miscellaneous retail
        });

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'simulations/card_authorizations',
          status: 200,
          resourceType: 'card_authorizations',
          resourceId: result.pending_transaction?.id || result.declined_transaction?.id,
          timestamp: new Date(),
        });

        if (result.declined_transaction) {
          throw new Error('Card authorization was declined');
        }

        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'completed' } : p
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'failed', error: errorMessage } : p
          )
        );
        throw error;
      }
    },
    [payments]
  );

  return (
    <BillPaymentContext.Provider value={{ payments, createPayment, settleDebitAndCreateCredit, settleCreditTransfer, simulateCardAuthorization, updatePayment }}>
      {children}
    </BillPaymentContext.Provider>
  );
}

export function useBillPayments() {
  const context = useContext(BillPaymentContext);
  if (!context) {
    throw new Error('useBillPayments must be used within a BillPaymentProvider');
  }
  return context;
}
