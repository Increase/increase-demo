import { http, HttpResponse } from 'msw';

// Counter for generating unique IDs
let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_test_${++idCounter}`;

// Store for tracking created resources (so settle calls can find them)
const createdTransfers: Record<string, { status: string; amount: number }> = {};

export const handlers = [
  // Create Entity
  http.post('*/entities', async () => {
    return HttpResponse.json({
      id: nextId('entity'),
      type: 'entity',
      structure: 'corporation',
      status: 'active',
      corporation: {
        name: 'Test Company',
      },
    });
  }),

  // Create Account
  http.post('*/accounts', async () => {
    return HttpResponse.json({
      id: nextId('account'),
      type: 'account',
      name: 'Operating Account',
      status: 'open',
      currency: 'USD',
      balance: 100000000, // $1,000,000 in cents
    });
  }),

  // Create External Account
  http.post('*/external_accounts', async () => {
    return HttpResponse.json({
      id: nextId('external_account'),
      type: 'external_account',
      description: 'Vendor Payment Account',
      routing_number: '101050001',
      account_number: '987654321',
      status: 'active',
    });
  }),

  // Create ACH Transfer
  http.post('*/ach_transfers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const id = nextId('ach_transfer');
    createdTransfers[id] = {
      status: 'pending_approval',
      amount: body.amount as number,
    };
    return HttpResponse.json({
      id,
      type: 'ach_transfer',
      amount: body.amount,
      status: 'pending_approval',
      account_id: body.account_id,
    });
  }),

  // Simulate ACH Transfer Settle
  http.post('*/simulations/ach_transfers/:id/settle', async ({ params }) => {
    const id = params.id as string;
    if (createdTransfers[id]) {
      createdTransfers[id].status = 'settled';
    }
    return HttpResponse.json({
      id,
      type: 'ach_transfer',
      status: 'settled',
    });
  }),

  // Simulate ACH Transfer Submit
  http.post('*/simulations/ach_transfers/:id/submit', async ({ params }) => {
    const id = params.id as string;
    if (createdTransfers[id]) {
      createdTransfers[id].status = 'submitted';
    }
    return HttpResponse.json({
      id,
      type: 'ach_transfer',
      status: 'submitted',
    });
  }),

  // Create Account Number (for RTP/Check)
  http.post('*/account_numbers', async () => {
    return HttpResponse.json({
      id: nextId('account_number'),
      type: 'account_number',
      account_id: 'account_test_1',
      name: 'Transfer Account Number',
      status: 'active',
    });
  }),

  // Create Wire Transfer
  http.post('*/wire_transfers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const id = nextId('wire_transfer');
    return HttpResponse.json({
      id,
      type: 'wire_transfer',
      amount: body.amount,
      status: 'pending_approval',
    });
  }),

  // Simulate Wire Transfer Submit
  http.post('*/simulations/wire_transfers/:id/submit', async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      type: 'wire_transfer',
      status: 'complete',
    });
  }),

  // Create RTP Transfer
  http.post('*/real_time_payments_transfers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const id = nextId('rtp_transfer');
    return HttpResponse.json({
      id,
      type: 'real_time_payments_transfer',
      amount: body.amount,
      status: 'pending_submission',
    });
  }),

  // Simulate RTP Transfer Complete
  http.post('*/simulations/real_time_payments_transfers/:id/complete', async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      type: 'real_time_payments_transfer',
      status: 'complete',
    });
  }),

  // Create Check Transfer
  http.post('*/check_transfers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const id = nextId('check_transfer');
    return HttpResponse.json({
      id,
      type: 'check_transfer',
      amount: body.amount,
      status: 'pending_approval',
      check_number: '00001234',
    });
  }),

  // Simulate Check Transfer Mail
  http.post('*/simulations/check_transfers/:id/mail', async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      type: 'check_transfer',
      status: 'mailed',
    });
  }),

  // Simulate Inbound Check Deposit
  http.post('*/simulations/inbound_check_deposits', async () => {
    return HttpResponse.json({
      id: nextId('inbound_check_deposit'),
      type: 'inbound_check_deposit',
      status: 'accepted',
    });
  }),

  // Create Card
  http.post('*/cards', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const id = nextId('card');
    return HttpResponse.json({
      id,
      type: 'card',
      description: body.description,
      status: 'active',
      last4: '4242',
    });
  }),

  // Simulate Card Authorization
  http.post('*/simulations/card_authorizations', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      type: 'inbound_card_authorization_simulation_result',
      pending_transaction: {
        id: nextId('pending_transaction'),
        amount: body.amount,
        status: 'pending',
      },
      declined_transaction: null,
    });
  }),
];
