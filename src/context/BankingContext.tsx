import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type Increase from 'increase';
import type { ApiRequest, InboundTransferType, OutboundTransferNetwork, TransferDetailType } from '../types';
import { createIncreaseClient } from '../lib/increase';

interface BankingContextType {
  account: Increase.Account | null;
  balance: Increase.BalanceLookup | null;
  accountNumbers: Increase.AccountNumber[];
  lockboxes: Increase.Lockbox[];
  pendingTransactions: Increase.PendingTransaction[];
  transactions: Increase.Transaction[];
  cards: Increase.Card[];
  initializeFromSession: (session: {
    account: Increase.Account;
    accountNumber?: Increase.AccountNumber;
    lockbox?: Increase.Lockbox;
    cards?: Increase.Card[];
  }) => void;
  refreshData: (
    apiKey: string,
    accountId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  rollAccountNumber: (
    apiKey: string,
    accountId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<Increase.AccountNumber>;
  rollLockbox: (
    apiKey: string,
    accountId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<Increase.Lockbox>;
  createCard: (
    apiKey: string,
    accountId: string,
    description: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<Increase.Card>;
  simulateInbound: (
    apiKey: string,
    accountNumberId: string,
    amount: number,
    type: InboundTransferType,
    checkNumber: string | undefined,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  simulateTransferActivity: (
    apiKey: string,
    transferType: TransferDetailType,
    transferId: string,
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
  sendTransfer: (
    apiKey: string,
    accountId: string,
    accountNumberId: string,
    network: OutboundTransferNetwork,
    amount: number,
    details: {
      accountNumber?: string;
      routingNumber?: string;
      statementDescriptor?: string;
      recipientName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zip?: string;
      memo?: string;
    },
    logFn: (req: ApiRequest) => void
  ) => Promise<void>;
}

const BankingContext = createContext<BankingContextType | null>(null);

export function BankingProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Increase.Account | null>(null);
  const [balance, setBalance] = useState<Increase.BalanceLookup | null>(null);
  const [accountNumbers, setAccountNumbers] = useState<Increase.AccountNumber[]>([]);
  const [lockboxes, setLockboxes] = useState<Increase.Lockbox[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Increase.PendingTransaction[]>([]);
  const [transactions, setTransactions] = useState<Increase.Transaction[]>([]);
  const [cards, setCards] = useState<Increase.Card[]>([]);

  const initializeFromSession = useCallback(
    (session: {
      account: Increase.Account;
      accountNumber?: Increase.AccountNumber;
      lockbox?: Increase.Lockbox;
      cards?: Increase.Card[];
    }) => {
      setAccount(session.account);
      if (session.accountNumber) setAccountNumbers((prev) => prev.length === 0 ? [session.accountNumber!] : prev);
      if (session.lockbox) setLockboxes((prev) => prev.length === 0 ? [session.lockbox!] : prev);
      if (session.cards?.length) setCards((prev) => prev.length === 0 ? session.cards! : prev);
    },
    []
  );

  const refreshData = useCallback(
    async (
      apiKey: string,
      accountId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);

      // Fetch all data in parallel, using allSettled so individual failures don't prevent other data from loading
      const results = await Promise.allSettled([
        client.accounts.retrieve(accountId),
        client.accounts.balance(accountId),
        client.accountNumbers.list({ account_id: accountId }),
        client.lockboxes.list({ account_id: accountId }),
        client.pendingTransactions.list({ account_id: accountId, status: { in: ['pending'] } }),
        client.transactions.list({ account_id: accountId }),
        client.cards.list({ account_id: accountId }),
      ]);

      const [accountResult, balanceResult, accountNumbersResult, lockboxesResult, pendingTransactionsResult, transactionsResult, cardsResult] = results;

      // Log and update each successful result
      if (accountResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `accounts/${accountId}`,
          status: 200,
          resourceType: 'accounts',
          resourceId: accountResult.value.id,
          timestamp: new Date(),
        });
        setAccount(accountResult.value);
      }
      if (balanceResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `accounts/${accountId}/balance`,
          status: 200,
          resourceType: 'accounts',
          timestamp: new Date(),
        });
        setBalance(balanceResult.value);
      }
      if (accountNumbersResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `account_numbers?account_id=${accountId}`,
          status: 200,
          resourceType: 'account_numbers',
          timestamp: new Date(),
        });
        setAccountNumbers(accountNumbersResult.value.data);
      }
      if (lockboxesResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `lockboxes?account_id=${accountId}`,
          status: 200,
          resourceType: 'lockboxes',
          timestamp: new Date(),
        });
        setLockboxes(lockboxesResult.value.data);
      }
      if (pendingTransactionsResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `pending_transactions?account_id=${accountId}`,
          status: 200,
          resourceType: 'pending_transactions',
          timestamp: new Date(),
        });
        setPendingTransactions(pendingTransactionsResult.value.data);
      }
      if (transactionsResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `transactions?account_id=${accountId}`,
          status: 200,
          resourceType: 'transactions',
          timestamp: new Date(),
        });
        setTransactions(transactionsResult.value.data);
      }
      if (cardsResult.status === 'fulfilled') {
        logFn({
          id: crypto.randomUUID(),
          method: 'GET',
          path: `cards?account_id=${accountId}`,
          status: 200,
          resourceType: 'cards',
          timestamp: new Date(),
        });
        setCards(cardsResult.value.data);
      }
    },
    []
  );

  const rollAccountNumber = useCallback(
    async (
      apiKey: string,
      accountId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<Increase.AccountNumber> => {
      const client = createIncreaseClient(apiKey);

      const accountNumber = await client.accountNumbers.create({
        account_id: accountId,
        name: `Account Number ${accountNumbers.length + 1}`,
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

      setAccountNumbers((prev) => [accountNumber, ...prev]);
      return accountNumber;
    },
    [accountNumbers.length]
  );

  const rollLockbox = useCallback(
    async (
      apiKey: string,
      accountId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<Increase.Lockbox> => {
      const client = createIncreaseClient(apiKey);

      const lockbox = await client.lockboxes.create({
        account_id: accountId,
        description: `Lockbox ${lockboxes.length + 1}`,
      });

      logFn({
        id: crypto.randomUUID(),
        method: 'POST',
        path: 'lockboxes',
        status: 200,
        resourceType: 'lockboxes',
        resourceId: lockbox.id,
        timestamp: new Date(),
      });

      setLockboxes((prev) => [lockbox, ...prev]);
      return lockbox;
    },
    [lockboxes.length]
  );

  const createCard = useCallback(
    async (
      apiKey: string,
      accountId: string,
      description: string,
      logFn: (req: ApiRequest) => void
    ): Promise<Increase.Card> => {
      const client = createIncreaseClient(apiKey);

      const card = await client.cards.create({
        account_id: accountId,
        description,
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

      setCards((prev) => [card, ...prev]);
      return card;
    },
    []
  );

  const simulateInbound = useCallback(
    async (
      apiKey: string,
      accountNumberId: string,
      amount: number,
      type: InboundTransferType,
      checkNumber: string | undefined,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);

      if (type === 'wire') {
        const result = await client.simulations.inboundWireTransfers.create({
          account_number_id: accountNumberId,
          amount,
        });

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'simulations/inbound_wire_transfers',
          status: 200,
          resourceType: 'inbound_wire_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (type === 'ach') {
        const result = await client.simulations.inboundACHTransfers.create({
          account_number_id: accountNumberId,
          amount,
          company_name: 'External Company',
          company_descriptive_date: new Date().toISOString().split('T')[0],
          company_entry_description: 'Payment',
        });

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'simulations/inbound_ach_transfers',
          status: 200,
          resourceType: 'inbound_ach_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (type === 'check') {
        const result = await client.simulations.inboundCheckDeposits.create({
          account_number_id: accountNumberId,
          amount,
          check_number: checkNumber || '1001',
        });

        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'simulations/inbound_check_deposits',
          status: 200,
          resourceType: 'inbound_check_deposits',
          resourceId: result.id,
          timestamp: new Date(),
        });
      }
    },
    []
  );

  const simulateTransferActivity = useCallback(
    async (
      apiKey: string,
      transferType: TransferDetailType,
      transferId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);

      if (transferType === 'ach_transfer') {
        const result = await client.simulations.achTransfers.settle(transferId, {});
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: `simulations/ach_transfers/${transferId}/settle`,
          status: 200,
          resourceType: 'ach_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (transferType === 'wire_transfer') {
        const result = await client.simulations.wireTransfers.submit(transferId);
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: `simulations/wire_transfers/${transferId}/submit`,
          status: 200,
          resourceType: 'wire_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (transferType === 'rtp_transfer') {
        const result = await client.simulations.realTimePaymentsTransfers.complete(transferId, {});
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: `simulations/real_time_payments_transfers/${transferId}/complete`,
          status: 200,
          resourceType: 'real_time_payments_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (transferType === 'check_transfer') {
        const result = await client.simulations.checkTransfers.mail(transferId);
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: `simulations/check_transfers/${transferId}/mail`,
          status: 200,
          resourceType: 'check_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      }
    },
    []
  );

  const sendTransfer = useCallback(
    async (
      apiKey: string,
      accountId: string,
      accountNumberId: string,
      network: OutboundTransferNetwork,
      amount: number,
      details: {
        accountNumber?: string;
        routingNumber?: string;
        statementDescriptor?: string;
        recipientName?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        zip?: string;
        memo?: string;
      },
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);

      if (network === 'ach') {
        const result = await client.achTransfers.create({
          account_id: accountId,
          amount,
          account_number: details.accountNumber!,
          routing_number: details.routingNumber!,
          statement_descriptor: details.statementDescriptor || 'Transfer',
        });
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'ach_transfers',
          status: 200,
          resourceType: 'ach_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (network === 'wire') {
        const result = await client.wireTransfers.create({
          account_id: accountId,
          amount,
          account_number: details.accountNumber!,
          routing_number: details.routingNumber!,
          creditor: { name: details.recipientName || 'Recipient' },
          remittance: {
            category: 'unstructured',
            unstructured: {
              message: details.statementDescriptor || 'Wire transfer',
            },
          } as Parameters<typeof client.wireTransfers.create>[0]['remittance'],
        });
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'wire_transfers',
          status: 200,
          resourceType: 'wire_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (network === 'rtp') {
        const result = await client.realTimePaymentsTransfers.create({
          amount,
          creditor_name: details.recipientName || 'Recipient',
          remittance_information: details.statementDescriptor || 'RTP transfer',
          source_account_number_id: accountNumberId,
          destination_account_number: details.accountNumber!,
          destination_routing_number: details.routingNumber!,
        });
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'real_time_payments_transfers',
          status: 200,
          resourceType: 'real_time_payments_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      } else if (network === 'check') {
        const result = await client.checkTransfers.create({
          account_id: accountId,
          amount,
          source_account_number_id: accountNumberId,
          fulfillment_method: 'physical_check',
          physical_check: {
            recipient_name: details.recipientName || 'Recipient',
            mailing_address: {
              line1: details.addressLine1 || '123 Main St',
              line2: details.addressLine2,
              city: details.city || 'New York',
              state: details.state || 'NY',
              postal_code: details.zip || '10001',
            },
            memo: details.memo || 'Payment',
          },
        });
        logFn({
          id: crypto.randomUUID(),
          method: 'POST',
          path: 'check_transfers',
          status: 200,
          resourceType: 'check_transfers',
          resourceId: result.id,
          timestamp: new Date(),
        });
      }
    },
    []
  );

  return (
    <BankingContext.Provider
      value={{
        account,
        balance,
        accountNumbers,
        lockboxes,
        pendingTransactions,
        transactions,
        cards,
        initializeFromSession,
        refreshData,
        rollAccountNumber,
        rollLockbox,
        createCard,
        simulateInbound,
        simulateTransferActivity,
        sendTransfer,
      }}
    >
      {children}
    </BankingContext.Provider>
  );
}

export function useBanking() {
  const context = useContext(BankingContext);
  if (!context) {
    throw new Error('useBanking must be used within a BankingProvider');
  }
  return context;
}
