import type Increase from 'increase';

export type Product = 'bill_pay' | 'banking';

export interface ApiRequest {
  id: string;
  method: string;
  path: string;
  status: number;
  resourceType: string;
  resourceId?: string;
  timestamp: Date;
}

export interface DemoSessionConfig {
  apiKey: string;
  companyName: string;
  endUserName: string;
  product: Product;
}

export interface DemoSession {
  config: DemoSessionConfig;
  entity: Increase.Entity;
  account: Increase.Account;
  externalAccount?: Increase.ExternalAccount;
  // Banking product
  accountNumber?: Increase.AccountNumber;
  lockbox?: Increase.Lockbox;
  cards?: Increase.Card[];
}

// Bill Payment Types
export type PaymentNetwork = 'ach' | 'rtp' | 'wire' | 'check' | 'card';

export type BillPaymentStatus =
  | 'pending_debit'
  | 'debit_processing'
  | 'debit_failed'
  | 'pending_credit'
  | 'credit_submitted'        // ACH: submitted, awaiting settlement
  | 'credit_mailed'           // Check: mailed, awaiting deposit
  | 'pending_authorization'   // Card: created, awaiting authorization
  | 'completed'
  | 'failed';

export interface AchPaymentDetails {
  network: 'ach';
  accountNumber: string;
  routingNumber: string;
  statementDescriptor: string;
}

export interface RtpPaymentDetails {
  network: 'rtp';
  accountNumber: string;
  routingNumber: string;
  statementDescriptor: string;
}

export interface WirePaymentDetails {
  network: 'wire';
  accountNumber: string;
  routingNumber: string;
  statementDescriptor: string;
}

export interface CheckPaymentDetails {
  network: 'check';
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  memo: string;
  shippingMethod: 'usps' | 'fedex';
}

export interface CardPaymentDetails {
  network: 'card';
  description: string; // Description for the card (e.g., "Single-use card for invoice #123")
}

export type PaymentDetails = AchPaymentDetails | RtpPaymentDetails | WirePaymentDetails | CheckPaymentDetails | CardPaymentDetails;

export type FundingMethod = 'ach_debit' | 'wire_drawdown';

export interface BillPayment {
  id: string;
  createdAt: Date;
  amount: number; // in cents
  status: BillPaymentStatus;
  fundingMethod: FundingMethod;
  externalAccountId: string;
  paymentDetails: PaymentDetails;
  debitTransferId?: string;
  wireDrawdownRequestId?: string;
  creditTransferId?: string;
  // For check transfers - needed to simulate inbound check deposit
  checkNumber?: string;
  sourceAccountNumberId?: string;
  // For card payments
  cardId?: string;
  cardLast4?: string;
  error?: string;
}

// Card Authorization Controls (not yet typed in the SDK)
export interface CardAuthorizationControls {
  usage?: {
    category: 'single_use' | 'multi_use';
    single_use?: {
      settlement_amount: {
        comparison: 'equals' | 'less_than_or_equals';
        value: number;
      };
    };
    multi_use?: {
      spending_limits?: Array<{
        interval: 'all_time' | 'per_transaction' | 'per_day' | 'per_week' | 'per_month';
        settlement_amount: number;
      }>;
    };
  };
}

// Banking Types
export type TransferDetailType =
  | 'ach_transfer'
  | 'wire_transfer'
  | 'rtp_transfer'
  | 'check_transfer'
  | 'card_payment'
  | 'check_deposit'
  | 'inbound_ach_transfer'
  | 'inbound_wire_transfer';

export type BankingViewState =
  | { view: 'overview' }
  | { view: 'transfer_detail'; transferType: TransferDetailType; transferId: string }
  | { view: 'lockbox_detail' }
  | { view: 'cards_list' }
  | { view: 'card_detail'; cardId: string };

export type InboundTransferType = 'ach' | 'wire' | 'check';

export type OutboundTransferNetwork = 'ach' | 'wire' | 'rtp' | 'check';

/** Maps a transaction or pending transaction source to a transfer type and ID for detail navigation. */
export function getTransferFromSource(
  source: Record<string, unknown> | undefined
): { type: TransferDetailType; id: string } | null {
  if (!source?.category) return null;
  const category = source.category as string;

  const mappings: Record<string, { type: TransferDetailType; key: string; idField: string }> = {
    // Transaction sources
    ach_transfer_intention: { type: 'ach_transfer', key: 'ach_transfer_intention', idField: 'transfer_id' },
    wire_transfer_intention: { type: 'wire_transfer', key: 'wire_transfer_intention', idField: 'transfer_id' },
    card_settlement: { type: 'card_payment', key: 'card_settlement', idField: 'card_payment_id' },
    check_deposit_acceptance: { type: 'check_deposit', key: 'check_deposit_acceptance', idField: 'check_deposit_id' },
    inbound_ach_transfer: { type: 'inbound_ach_transfer', key: 'inbound_ach_transfer', idField: 'transfer_id' },
    inbound_wire_transfer: { type: 'inbound_wire_transfer', key: 'inbound_wire_transfer', idField: 'transfer_id' },
    // Pending transaction sources
    ach_transfer_instruction: { type: 'ach_transfer', key: 'ach_transfer_instruction', idField: 'transfer_id' },
    wire_transfer_instruction: { type: 'wire_transfer', key: 'wire_transfer_instruction', idField: 'transfer_id' },
    real_time_payments_transfer_instruction: { type: 'rtp_transfer', key: 'real_time_payments_transfer_instruction', idField: 'transfer_id' },
    check_transfer_instruction: { type: 'check_transfer', key: 'check_transfer_instruction', idField: 'transfer_id' },
    card_authorization: { type: 'card_payment', key: 'card_authorization', idField: 'card_payment_id' },
  };

  const mapping = mappings[category];
  if (!mapping) return null;

  const detail = source[mapping.key] as Record<string, unknown> | undefined;
  const id = detail?.[mapping.idField] as string | undefined;
  if (!id) return null;

  return { type: mapping.type, id };
}
