import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type Increase from 'increase';
import type { ApiRequest, InboundTransferType } from '../types';
import { createIncreaseClient } from '../lib/increase';

interface BankingContextType {
  account: Increase.Account | null;
  balance: Increase.BalanceLookup | null;
  accountNumbers: Increase.AccountNumber[];
  lockboxes: Increase.Lockbox[];
  transactions: Increase.Transaction[];
  cards: Increase.Card[];
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
}

const BankingContext = createContext<BankingContextType | null>(null);

export function BankingProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Increase.Account | null>(null);
  const [balance, setBalance] = useState<Increase.BalanceLookup | null>(null);
  const [accountNumbers, setAccountNumbers] = useState<Increase.AccountNumber[]>([]);
  const [lockboxes, setLockboxes] = useState<Increase.Lockbox[]>([]);
  const [transactions, setTransactions] = useState<Increase.Transaction[]>([]);
  const [cards, setCards] = useState<Increase.Card[]>([]);

  const refreshData = useCallback(
    async (
      apiKey: string,
      accountId: string,
      logFn: (req: ApiRequest) => void
    ): Promise<void> => {
      const client = createIncreaseClient(apiKey);

      // Fetch all data in parallel
      const [accountData, balanceData, accountNumbersData, lockboxesData, transactionsData, cardsData] =
        await Promise.all([
          client.accounts.retrieve(accountId),
          client.accounts.balance(accountId),
          client.accountNumbers.list({ account_id: accountId }),
          client.lockboxes.list({ account_id: accountId }),
          client.transactions.list({ account_id: accountId }),
          client.cards.list({ account_id: accountId }),
        ]);

      // Log all requests
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `accounts/${accountId}`,
        status: 200,
        resourceType: 'accounts',
        resourceId: accountData.id,
        timestamp: new Date(),
      });
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `accounts/${accountId}/balance`,
        status: 200,
        resourceType: 'accounts',
        timestamp: new Date(),
      });
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `account_numbers?account_id=${accountId}`,
        status: 200,
        resourceType: 'account_numbers',
        timestamp: new Date(),
      });
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `lockboxes?account_id=${accountId}`,
        status: 200,
        resourceType: 'lockboxes',
        timestamp: new Date(),
      });
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `transactions?account_id=${accountId}`,
        status: 200,
        resourceType: 'transactions',
        timestamp: new Date(),
      });
      logFn({
        id: crypto.randomUUID(),
        method: 'GET',
        path: `cards?account_id=${accountId}`,
        status: 200,
        resourceType: 'cards',
        timestamp: new Date(),
      });

      // Update state
      setAccount(accountData);
      setBalance(balanceData);
      setAccountNumbers(accountNumbersData.data);
      setLockboxes(lockboxesData.data);
      setTransactions(transactionsData.data);
      setCards(cardsData.data);
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

  return (
    <BankingContext.Provider
      value={{
        account,
        balance,
        accountNumbers,
        lockboxes,
        transactions,
        cards,
        refreshData,
        rollAccountNumber,
        rollLockbox,
        createCard,
        simulateInbound,
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
