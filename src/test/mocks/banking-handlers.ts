/**
 * Banking-specific MSW handlers based on real Increase sandbox API responses.
 * These provide realistic mock responses for the banking demo session setup flow.
 */
import { http, HttpResponse } from 'msw';

// Counter for generating unique IDs
let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_test_${++idCounter}`;

// Store for tracking state across handlers
interface PendingTransaction {
  id: string;
  account_id: string;
  amount: number;
  held_amount: number;
  description: string;
  created_at: string;
  status: string;
  route_id: string | null;
  route_type: string | null;
  source: {
    category: string;
    [key: string]: unknown;
  };
}

interface BankingState {
  entityId: string | null;
  accountId: string | null;
  accountNumberId: string | null;
  lockboxAddressId: string | null;
  lockboxRecipientId: string | null;
  cardIds: string[];
  achTransferId: string | null;
  pendingTransactionIds: string[];
  pendingTransactions: PendingTransaction[];
  transactions: Transaction[];
  cards: Card[];
  accountNumbers: AccountNumber[];
  lockboxAddresses: LockboxAddress[];
  lockboxRecipients: LockboxRecipient[];
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  route_id: string | null;
  route_type: string | null;
  source: {
    category: string;
    [key: string]: unknown;
  };
}

interface Card {
  id: string;
  description: string;
  last4: string;
  status: string;
  created_at: string;
  account_id: string;
  expiration_month: number;
  expiration_year: number;
  authorization_controls: Record<string, unknown> | null;
}

interface AccountNumber {
  id: string;
  account_id: string;
  account_number: string;
  routing_number: string;
  name: string;
  status: string;
  created_at: string;
}

interface LockboxAddress {
  id: string;
  description: string;
  status: string;
  created_at: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

interface LockboxRecipient {
  id: string;
  account_id: string;
  lockbox_address_id: string;
  description: string | null;
  recipient_name: string | null;
  mail_stop_code: string;
  status: string;
  created_at: string;
}

const state: BankingState = {
  entityId: null,
  accountId: null,
  accountNumberId: null,
  lockboxAddressId: null,
  lockboxRecipientId: null,
  cardIds: [],
  achTransferId: null,
  pendingTransactionIds: [],
  pendingTransactions: [],
  transactions: [],
  cards: [],
  accountNumbers: [],
  lockboxAddresses: [],
  lockboxRecipients: [],
};

// Track pending check deposits from mail items
const pendingCheckDeposits = new Map<string, { amount: number; lockbox_recipient_id: string | null }>();

// Generic transfer store for retrieve endpoints
const transfers = new Map<string, Record<string, unknown>>();

export function resetBankingState() {
  state.entityId = null;
  state.accountId = null;
  state.accountNumberId = null;
  state.lockboxAddressId = null;
  state.lockboxRecipientId = null;
  state.cardIds = [];
  state.achTransferId = null;
  state.pendingTransactionIds = [];
  state.pendingTransactions = [];
  state.transactions = [];
  state.cards = [];
  state.accountNumbers = [];
  state.lockboxAddresses = [];
  state.lockboxRecipients = [];
  pendingCheckDeposits.clear();
  transfers.clear();
  idCounter = 0;
}

export const bankingHandlers = [
  // Create Entity
  http.post('*/entities', async () => {
    state.entityId = nextId('entity');
    return HttpResponse.json({
      type: 'entity',
      id: state.entityId,
      structure: 'corporation',
      corporation: {
        name: 'Test Banking Company',
        website: null,
        email: null,
        tax_identifier: '123456789',
        incorporation_state: null,
        industry_code: null,
        address: {
          line1: '123 Main St',
          line2: null,
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
        beneficial_owners: [
          {
            individual: {
              name: 'Jane Demo',
              date_of_birth: '1980-01-01',
              address: {
                line1: '123 Main St',
                line2: null,
                city: 'San Francisco',
                state: 'CA',
                zip: '94102',
                country: 'US',
              },
              identification: {
                method: 'social_security_number',
                number_last4: '1120',
                country: 'US',
              },
            },
            company_title: null,
            prong: 'ownership',
          },
        ],
      },
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }),

  // Create Account
  http.post('*/accounts', async () => {
    state.accountId = nextId('account');
    return HttpResponse.json({
      type: 'account',
      id: state.accountId,
      entity_id: state.entityId,
      name: 'Operating Account',
      status: 'open',
      currency: 'USD',
      bank: 'first_internet_bank',
      created_at: new Date().toISOString(),
      balance: null,
      balances: null,
    });
  }),

  // Create External Account
  http.post('*/external_accounts', async () => {
    return HttpResponse.json({
      id: nextId('external_account'),
      type: 'external_account',
      description: 'Customer External Account (Chase Bank)',
      routing_number: '101050001',
      account_number: '987654321',
      status: 'active',
    });
  }),

  // Account Balance
  http.get('*/accounts/:id/balance', async () => {
    const balance = state.transactions.reduce((sum, t) => sum + t.amount, 0);
    return HttpResponse.json({
      type: 'balance_lookup',
      account_id: state.accountId || 'account_test_1',
      available_balance: balance,
      current_balance: balance,
      loan: null,
    });
  }),

  // Retrieve Account
  http.get('*/accounts/:id', async () => {
    return HttpResponse.json({
      type: 'account',
      id: state.accountId || 'account_test_1',
      entity_id: state.entityId,
      name: 'Operating Account',
      status: 'open',
      currency: 'USD',
      bank: 'first_internet_bank',
      created_at: new Date().toISOString(),
      balance: null,
      balances: null,
    });
  }),

  // Create Account Number
  http.post('*/account_numbers', async ({ request }) => {
    const body = (await request.json()) as { account_id?: string; name?: string };
    const accountNumber: AccountNumber = {
      id: nextId('account_number'),
      account_id: body.account_id || state.accountId || 'account_test_1',
      account_number: String(Math.floor(Math.random() * 9000000000) + 1000000000),
      routing_number: '074920909',
      name: body.name || 'Account Number',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    state.accountNumbers.unshift(accountNumber);
    if (!state.accountNumberId) {
      state.accountNumberId = accountNumber.id;
    }
    return HttpResponse.json({
      type: 'account_number',
      ...accountNumber,
      inbound_ach: { debit_status: 'allowed' },
      inbound_checks: { status: 'check_transfers_only' },
    });
  }),

  // List Account Numbers
  http.get('*/account_numbers', async () => {
    const data =
      state.accountNumbers.length > 0
        ? state.accountNumbers.map((an) => ({
            type: 'account_number',
            ...an,
            inbound_ach: { debit_status: 'allowed' },
            inbound_checks: { status: 'check_transfers_only' },
          }))
        : [
            {
              type: 'account_number',
              id: 'account_number_test_1',
              account_id: state.accountId || 'account_test_1',
              account_number: '1234567890',
              routing_number: '074920909',
              name: 'Primary Account Number',
              status: 'active',
              created_at: new Date().toISOString(),
              inbound_ach: { debit_status: 'allowed' },
              inbound_checks: { status: 'check_transfers_only' },
            },
          ];
    return HttpResponse.json({ data });
  }),

  // Create Lockbox Address
  http.post('*/lockbox_addresses', async ({ request }) => {
    const body = (await request.json()) as { description?: string };
    const lockboxAddress: LockboxAddress = {
      id: nextId('lockbox_address'),
      description: body.description || 'Lockbox',
      status: 'active',
      created_at: new Date().toISOString(),
      address: {
        line1: '2261 Market St',
        line2: `Ste ${Math.floor(Math.random() * 9999)}`,
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94114',
      },
    };
    state.lockboxAddresses.unshift(lockboxAddress);
    if (!state.lockboxAddressId) {
      state.lockboxAddressId = lockboxAddress.id;
    }
    return HttpResponse.json({
      type: 'lockbox_address',
      ...lockboxAddress,
      idempotency_key: null,
    });
  }),

  // List Lockbox Addresses
  http.get('*/lockbox_addresses', async () => {
    const data =
      state.lockboxAddresses.length > 0
        ? state.lockboxAddresses.map((lb) => ({
            type: 'lockbox_address',
            ...lb,
            idempotency_key: null,
          }))
        : [
            {
              type: 'lockbox_address',
              id: 'lockbox_address_test_1',
              description: 'Primary Lockbox',
              status: 'active',
              created_at: new Date().toISOString(),
              idempotency_key: null,
              address: {
                line1: '2261 Market St',
                line2: 'Ste 5792',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94114',
              },
            },
          ];
    return HttpResponse.json({ data });
  }),

  // Create Lockbox Recipient
  http.post('*/lockbox_recipients', async ({ request }) => {
    const body = (await request.json()) as {
      account_id?: string;
      lockbox_address_id?: string;
      description?: string;
      recipient_name?: string;
    };
    const recipient: LockboxRecipient = {
      id: nextId('lockbox_recipient'),
      account_id: body.account_id || state.accountId || 'account_test_1',
      lockbox_address_id: body.lockbox_address_id || state.lockboxAddressId || 'lockbox_address_test_1',
      description: body.description || null,
      recipient_name: body.recipient_name || null,
      mail_stop_code: `MS${Math.floor(Math.random() * 9000) + 1000}`,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    state.lockboxRecipients.unshift(recipient);
    if (!state.lockboxRecipientId) {
      state.lockboxRecipientId = recipient.id;
    }
    return HttpResponse.json({
      type: 'lockbox_recipient',
      ...recipient,
      idempotency_key: null,
    });
  }),

  // List Lockbox Recipients
  http.get('*/lockbox_recipients', async () => {
    const data = state.lockboxRecipients.map((r) => ({
      type: 'lockbox_recipient',
      ...r,
      idempotency_key: null,
    }));
    return HttpResponse.json({ data });
  }),

  // Create Card
  http.post('*/cards', async ({ request }) => {
    const body = (await request.json()) as {
      account_id?: string;
      description?: string;
      authorization_controls?: Record<string, unknown>;
    };
    const card: Card = {
      id: nextId('card'),
      account_id: body.account_id || state.accountId || 'account_test_1',
      description: body.description || 'Virtual Card',
      last4: String(Math.floor(Math.random() * 9000) + 1000),
      status: 'active',
      created_at: new Date().toISOString(),
      expiration_month: 1,
      expiration_year: 2030,
      authorization_controls: body.authorization_controls || null,
    };
    state.cards.unshift(card);
    state.cardIds.push(card.id);
    return HttpResponse.json({
      type: 'card',
      ...card,
      entity_id: null,
      billing_address: {
        line1: '123 Main St',
        line2: null,
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94102',
      },
    });
  }),

  // List Cards
  http.get('*/cards', async () => {
    return HttpResponse.json({
      data: state.cards.map((card) => ({
        type: 'card',
        ...card,
        entity_id: null,
        billing_address: {
          line1: '123 Main St',
          line2: null,
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
        },
        authorization_controls: card.authorization_controls,
      })),
    });
  }),

  // Create ACH Transfer
  http.post('*/ach_transfers', async ({ request }) => {
    const body = (await request.json()) as {
      account_id?: string;
      amount?: number;
      statement_descriptor?: string;
    };
    state.achTransferId = nextId('ach_transfer');
    const pendingTxnId = nextId('pending_transaction');
    const amount = body.amount || 0;

    state.pendingTransactions.unshift({
      id: pendingTxnId,
      account_id: body.account_id || state.accountId || 'account_test_1',
      amount: -Math.abs(amount),
      held_amount: -Math.abs(amount),
      description: body.statement_descriptor || 'ACH Transfer',
      created_at: new Date().toISOString(),
      status: 'pending',
      route_id: null,
      route_type: null,
      source: {
        category: 'ach_transfer_instruction',
        ach_transfer_instruction: { transfer_id: state.achTransferId },
      },
    });

    const achTransfer = {
      type: 'ach_transfer',
      id: state.achTransferId,
      account_id: body.account_id || state.accountId,
      amount,
      status: 'pending_submission',
      statement_descriptor: body.statement_descriptor || 'Transfer',
      routing_number: (body as Record<string, unknown>).routing_number || '101050001',
      account_number: (body as Record<string, unknown>).account_number || '987654321',
      created_at: new Date().toISOString(),
      pending_transaction_id: pendingTxnId,
      transaction_id: null,
    };
    transfers.set(state.achTransferId!, achTransfer);
    return HttpResponse.json(achTransfer);
  }),

  // Submit ACH Transfer
  http.post('*/simulations/ach_transfers/:id/submit', async ({ params }) => {
    return HttpResponse.json({
      type: 'ach_transfer',
      id: params.id,
      status: 'submitted',
      submission: {
        trace_number: '494477551706724',
        submitted_at: new Date().toISOString(),
        expected_funds_settlement_at: new Date(Date.now() + 86400000).toISOString(),
        effective_date: new Date().toISOString().split('T')[0],
      },
    });
  }),

  // Settle ACH Transfer
  http.post('*/simulations/ach_transfers/:id/settle', async ({ params, request }) => {
    const body = (await request.json()) as { amount?: number };
    const stored = transfers.get(params.id as string);
    const amount = body.amount || (stored?.amount as number) || 120000;
    // Update stored transfer status
    if (stored) stored.status = 'returned';
    const txnId = nextId('transaction');
    state.transactions.unshift({
      id: txnId,
      amount: -amount,
      description: 'Payroll',
      created_at: new Date().toISOString(),
      route_id: null,
      route_type: null,
      source: {
        category: 'ach_transfer_intention',
        ach_transfer_intention: {
          amount,
          statement_descriptor: 'Payroll',
          transfer_id: params.id as string,
        },
      },
    });
    return HttpResponse.json({
      type: 'ach_transfer',
      id: params.id,
      status: 'submitted',
      settlement: {
        settled_at: new Date().toISOString(),
      },
      transaction_id: txnId,
    });
  }),

  // Simulate Inbound Wire Transfer
  http.post('*/simulations/inbound_wire_transfers', async ({ request }) => {
    const body = (await request.json()) as { account_number_id?: string; amount?: number };
    const wireId = nextId('inbound_wire_transfer');
    const txnId = nextId('transaction');
    const amount = body.amount || 1000000;

    state.transactions.unshift({
      id: txnId,
      amount,
      description: 'Test wire transfer',
      created_at: new Date().toISOString(),
      route_id: body.account_number_id || state.accountNumberId,
      route_type: 'account_number',
      source: {
        category: 'inbound_wire_transfer',
        inbound_wire_transfer: {
          amount,
          description: 'Test wire transfer',
          transfer_id: wireId,
        },
      },
    });

    const inboundWire = {
      type: 'inbound_wire_transfer',
      id: wireId,
      amount,
      account_id: state.accountId,
      account_number_id: body.account_number_id || state.accountNumberId,
      status: 'accepted',
      created_at: new Date().toISOString(),
      description: 'Test wire transfer',
    };
    transfers.set(wireId, inboundWire);
    return HttpResponse.json(inboundWire);
  }),

  // Simulate Inbound Mail Items (lockbox check)
  http.post('*/simulations/inbound_mail_items', async ({ request }) => {
    const body = (await request.json()) as {
      lockbox_address_id?: string;
      lockbox_recipient_id?: string;
      amount?: number;
    };
    const mailItemId = nextId('inbound_mail_item');
    const checkDepositId = nextId('inbound_check_deposit');
    const fileId = nextId('file');
    const amount = body.amount || 250000;
    const recipientId = body.lockbox_recipient_id || state.lockboxRecipientId || null;
    const addressId =
      body.lockbox_address_id ||
      state.lockboxRecipients.find((r) => r.id === recipientId)?.lockbox_address_id ||
      state.lockboxAddressId ||
      'lockbox_address_test_1';

    // Store the check deposit info for later submission
    pendingCheckDeposits.set(checkDepositId, {
      amount,
      lockbox_recipient_id: recipientId,
    });

    return HttpResponse.json({
      type: 'inbound_mail_item',
      id: mailItemId,
      created_at: new Date().toISOString(),
      recipient_name: null,
      status: 'processed',
      rejection_reason: null,
      file_id: fileId,
      lockbox_address_id: addressId,
      lockbox_recipient_id: recipientId,
      checks: [
        {
          amount,
          status: 'pending',
          front_file_id: fileId,
          back_file_id: fileId,
          check_deposit_id: checkDepositId,
        },
      ],
    });
  }),

  // Submit Check Deposit simulation
  http.post('*/simulations/check_deposits/:id/submit', async ({ params }) => {
    const checkDepositId = params.id as string;
    const depositInfo = pendingCheckDeposits.get(checkDepositId);
    const amount = depositInfo?.amount || 250000;

    const txnId = nextId('transaction');
    state.transactions.unshift({
      id: txnId,
      amount,
      description: 'Check deposit via lockbox',
      created_at: new Date().toISOString(),
      route_id: depositInfo?.lockbox_recipient_id || state.lockboxRecipientId,
      route_type: 'lockbox_recipient',
      source: {
        category: 'check_deposit_acceptance',
        check_deposit_acceptance: {
          amount,
          check_deposit_id: checkDepositId,
        },
      },
    });

    const checkDeposit = {
      type: 'check_deposit',
      id: checkDepositId,
      status: 'submitted',
      amount,
      transaction_id: txnId,
      created_at: new Date().toISOString(),
    };
    transfers.set(checkDepositId, checkDeposit);
    return HttpResponse.json(checkDeposit);
  }),

  // Simulate Inbound ACH Transfer
  http.post('*/simulations/inbound_ach_transfers', async ({ request }) => {
    const body = (await request.json()) as { account_number_id?: string; amount?: number };
    const achId = nextId('inbound_ach_transfer');
    const txnId = nextId('transaction');
    const amount = body.amount || 100000;

    state.transactions.unshift({
      id: txnId,
      amount,
      description: 'Inbound ACH from External Company',
      created_at: new Date().toISOString(),
      route_id: body.account_number_id || state.accountNumberId,
      route_type: 'account_number',
      source: {
        category: 'inbound_ach_transfer',
        inbound_ach_transfer: {
          amount,
          transfer_id: achId,
        },
      },
    });

    const inboundAch = {
      type: 'inbound_ach_transfer',
      id: achId,
      amount,
      status: 'accepted',
      company_name: 'External Company',
      account_number_id: body.account_number_id || state.accountNumberId,
      created_at: new Date().toISOString(),
    };
    transfers.set(achId, inboundAch);
    return HttpResponse.json(inboundAch);
  }),

  // Simulate Inbound Check Deposit
  http.post('*/simulations/inbound_check_deposits', async ({ request }) => {
    const body = (await request.json()) as { account_number_id?: string; amount?: number };
    return HttpResponse.json({
      id: nextId('inbound_check_deposit'),
      type: 'inbound_check_deposit',
      status: 'accepted',
      amount: body.amount || 100000,
    });
  }),

  // Simulate Card Authorization
  http.post('*/simulations/card_authorizations', async ({ request }) => {
    const body = (await request.json()) as {
      card_id?: string;
      amount?: number;
      merchant_descriptor?: string;
    };
    const pendingTxnId = nextId('pending_transaction');
    state.pendingTransactionIds.push(pendingTxnId);
    const cardAuthId = nextId('card_authorization');
    const cardPaymentId = nextId('card_payment');

    // Store card payment for retrieve
    transfers.set(cardPaymentId, {
      type: 'card_payment',
      id: cardPaymentId,
      card_id: body.card_id,
      created_at: new Date().toISOString(),
      state: {
        authorized_amount: body.amount || 0,
        settled_amount: 0,
      },
    });

    return HttpResponse.json({
      type: 'inbound_card_authorization_simulation_result',
      pending_transaction: {
        type: 'pending_transaction',
        id: pendingTxnId,
        account_id: state.accountId,
        amount: -(body.amount || 0),
        held_amount: -(body.amount || 0),
        currency: 'USD',
        created_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        description: body.merchant_descriptor || 'Card purchase',
        route_id: body.card_id,
        route_type: 'card',
        status: 'pending',
        source: {
          category: 'card_authorization',
          card_authorization: {
            type: 'card_authorization',
            id: cardAuthId,
            card_payment_id: cardPaymentId,
            merchant_descriptor: body.merchant_descriptor || 'MERCHANT',
            amount: body.amount || 0,
          },
        },
      },
      declined_transaction: null,
    });
  }),

  // Simulate Card Settlement
  http.post('*/simulations/card_settlements', async ({ request }) => {
    const body = (await request.json()) as {
      card_id?: string;
      pending_transaction_id?: string;
      amount?: number;
    };
    const txnId = nextId('transaction');
    const settlementId = nextId('card_settlement');

    // Get card info for route
    const card = state.cards.find((c) => c.id === body.card_id);
    const amount = body.amount || 5000;

    state.transactions.unshift({
      id: txnId,
      amount: -amount,
      description: card?.description || 'Card purchase',
      created_at: new Date().toISOString(),
      route_id: body.card_id || null,
      route_type: body.card_id ? 'card' : null,
      source: {
        category: 'card_settlement',
        card_settlement: {
          type: 'card_settlement',
          id: settlementId,
          amount,
          pending_transaction_id: body.pending_transaction_id,
          transaction_id: txnId,
        },
      },
    });

    return HttpResponse.json({
      type: 'transaction',
      id: txnId,
      account_id: state.accountId,
      amount: -amount,
      currency: 'USD',
      created_at: new Date().toISOString(),
      description: card?.description || 'Card purchase',
      route_id: body.card_id,
      route_type: 'card',
      source: {
        category: 'card_settlement',
        card_settlement: {
          type: 'card_settlement',
          id: settlementId,
          amount,
          pending_transaction_id: body.pending_transaction_id,
          transaction_id: txnId,
        },
      },
    });
  }),

  // List Pending Transactions
  http.get('*/pending_transactions', async () => {
    return HttpResponse.json({
      data: state.pendingTransactions
        .filter((pt) => pt.status === 'pending')
        .map((pt) => ({
          type: 'pending_transaction',
          ...pt,
          currency: 'USD',
          completed_at: null,
          date: pt.created_at.split('T')[0],
        })),
    });
  }),

  // List Transactions
  http.get('*/transactions', async () => {
    return HttpResponse.json({
      data: state.transactions.map((t) => ({
        type: 'transaction',
        ...t,
        currency: 'USD',
        date: t.created_at.split('T')[0],
      })),
    });
  }),

  // Wire Transfer handlers
  http.post('*/wire_transfers', async ({ request }) => {
    const body = (await request.json()) as { account_id?: string; amount?: number };
    const wireId = nextId('wire_transfer');
    const pendingTxnId = nextId('pending_transaction');
    const amount = body.amount || 0;

    state.pendingTransactions.unshift({
      id: pendingTxnId,
      account_id: body.account_id || state.accountId || 'account_test_1',
      amount: -Math.abs(amount),
      held_amount: -Math.abs(amount),
      description: 'Wire transfer',
      created_at: new Date().toISOString(),
      status: 'pending',
      route_id: null,
      route_type: null,
      source: {
        category: 'wire_transfer_instruction',
        wire_transfer_instruction: { transfer_id: wireId },
      },
    });

    const wireTransfer = {
      id: wireId,
      type: 'wire_transfer',
      amount,
      status: 'pending_approval',
      pending_transaction_id: pendingTxnId,
      created_at: new Date().toISOString(),
    };
    transfers.set(wireId, wireTransfer);
    return HttpResponse.json(wireTransfer);
  }),

  http.post('*/simulations/wire_transfers/:id/submit', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) stored.status = 'complete';
    return HttpResponse.json({
      id: params.id,
      type: 'wire_transfer',
      status: 'complete',
    });
  }),

  // RTP handlers
  http.post('*/real_time_payments_transfers', async ({ request }) => {
    const body = (await request.json()) as { amount?: number };
    const rtpId = nextId('rtp_transfer');
    const pendingTxnId = nextId('pending_transaction');
    const amount = body.amount || 0;

    state.pendingTransactions.unshift({
      id: pendingTxnId,
      account_id: state.accountId || 'account_test_1',
      amount: -Math.abs(amount),
      held_amount: -Math.abs(amount),
      description: 'RTP transfer',
      created_at: new Date().toISOString(),
      status: 'pending',
      route_id: null,
      route_type: null,
      source: {
        category: 'real_time_payments_transfer_instruction',
        real_time_payments_transfer_instruction: { transfer_id: rtpId },
      },
    });

    const rtpTransfer = {
      id: rtpId,
      type: 'real_time_payments_transfer',
      amount,
      status: 'pending_submission',
      creditor_name: 'Recipient',
      remittance_information: 'Transfer',
      pending_transaction_id: pendingTxnId,
      created_at: new Date().toISOString(),
    };
    transfers.set(rtpId, rtpTransfer);
    return HttpResponse.json(rtpTransfer);
  }),

  http.post('*/simulations/real_time_payments_transfers/:id/complete', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) stored.status = 'complete';
    return HttpResponse.json({
      id: params.id,
      type: 'real_time_payments_transfer',
      status: 'complete',
    });
  }),

  // Check Transfer handlers
  http.post('*/check_transfers', async ({ request }) => {
    const body = (await request.json()) as { account_id?: string; amount?: number };
    const checkId = nextId('check_transfer');
    const pendingTxnId = nextId('pending_transaction');
    const amount = body.amount || 0;

    state.pendingTransactions.unshift({
      id: pendingTxnId,
      account_id: body.account_id || state.accountId || 'account_test_1',
      amount: -Math.abs(amount),
      held_amount: -Math.abs(amount),
      description: 'Check transfer',
      created_at: new Date().toISOString(),
      status: 'pending',
      route_id: null,
      route_type: null,
      source: {
        category: 'check_transfer_instruction',
        check_transfer_instruction: { transfer_id: checkId },
      },
    });

    const checkTransfer = {
      id: checkId,
      type: 'check_transfer',
      amount,
      status: 'pending_approval',
      check_number: '00001234',
      pending_transaction_id: pendingTxnId,
      created_at: new Date().toISOString(),
    };
    transfers.set(checkId, checkTransfer);
    return HttpResponse.json(checkTransfer);
  }),

  http.post('*/simulations/check_transfers/:id/mail', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) stored.status = 'mailed';
    return HttpResponse.json({
      id: params.id,
      type: 'check_transfer',
      status: 'mailed',
    });
  }),

  // Also store inbound transfers for retrieve
  // (inbound wire transfers are already created in the simulation handler above)

  // Generic transfer retrieve handler
  http.get('*/ach_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'ach_transfer', status: 'returned', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/wire_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'wire_transfer', status: 'complete', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/real_time_payments_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'real_time_payments_transfer', status: 'complete', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/check_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'check_transfer', status: 'mailed', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/card_payments/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'card_payment', card_id: 'card_test_1', state: { authorized_amount: 0, settled_amount: 0 }, created_at: new Date().toISOString() });
  }),

  http.get('*/check_deposits/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'check_deposit', status: 'accepted', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/inbound_ach_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'inbound_ach_transfer', status: 'accepted', amount: 0, created_at: new Date().toISOString() });
  }),

  http.get('*/inbound_wire_transfers/:id', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) return HttpResponse.json(stored);
    return HttpResponse.json({ id: params.id, type: 'inbound_wire_transfer', status: 'accepted', amount: 0, description: 'Wire transfer', created_at: new Date().toISOString() });
  }),

  // Wire Drawdown Request handlers
  http.post('*/wire_drawdown_requests', async ({ request }) => {
    const body = (await request.json()) as { amount?: number };
    const drawdownId = nextId('wire_drawdown_request');
    const drawdown = {
      type: 'wire_drawdown_request',
      id: drawdownId,
      amount: body.amount || 0,
      status: 'pending_submission',
      created_at: new Date().toISOString(),
      fulfillment_inbound_wire_transfer_id: null,
    };
    transfers.set(drawdownId, drawdown);
    return HttpResponse.json(drawdown);
  }),

  http.post('*/simulations/wire_drawdown_requests/:id/submit', async ({ params }) => {
    const stored = transfers.get(params.id as string);
    if (stored) stored.status = 'pending_response';
    return HttpResponse.json({
      id: params.id,
      type: 'wire_drawdown_request',
      status: 'pending_response',
    });
  }),
];
