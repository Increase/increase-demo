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

export interface BillPayment {
  id: string;
  createdAt: Date;
  amount: number; // in cents
  status: BillPaymentStatus;
  externalAccountId: string;
  paymentDetails: PaymentDetails;
  debitTransferId?: string;
  creditTransferId?: string;
  // For check transfers - needed to simulate inbound check deposit
  checkNumber?: string;
  sourceAccountNumberId?: string;
  // For card payments
  cardId?: string;
  cardLast4?: string;
  error?: string;
}

// Banking Types
export type BankingViewState =
  | { view: 'overview' }
  | { view: 'transaction_detail'; transactionId: string }
  | { view: 'lockbox_detail' }
  | { view: 'cards_list' }
  | { view: 'card_detail'; cardId: string };

export type InboundTransferType = 'ach' | 'wire' | 'check';
