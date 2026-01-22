import Increase from 'increase';
import type { DemoSession, DemoSessionConfig, ApiRequest } from '../types';

export function createIncreaseClient(apiKey: string): Increase {
  return new Increase({
    apiKey,
    baseURL: `${window.location.origin}/api`,
  });
}

function getResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[0] || 'unknown';
}

function getDashboardPath(resourceType: string, id: string): string | null {
  const typeMap: Record<string, string | null> = {
    entities: 'entities',
    accounts: 'accounts',
    account_numbers: 'account_numbers',
    external_accounts: 'external_accounts',
    ach_transfers: 'transfers',
    wire_transfers: 'transfers',
    real_time_payments_transfers: 'transfers',
    check_transfers: 'transfers',
    cards: 'cards',
    transactions: 'transactions',
    lockboxes: 'lockboxes',
    inbound_ach_transfers: 'inbound_ach_transfers',
    inbound_wire_transfers: 'inbound_wire_transfers',
    inbound_check_deposits: 'inbound_check_deposits',
    simulations: null,
  };
  const dashboardType = typeMap[resourceType];
  if (!dashboardType) return null;
  return `https://dashboard.increase.com/${dashboardType}/${id}`;
}

type LogFn = (request: ApiRequest) => void;

async function loggedRequest<T extends { id?: string }>(
  logFn: LogFn,
  method: string,
  path: string,
  request: () => Promise<T>
): Promise<T> {
  const resourceType = getResourceType(path);
  try {
    const result = await request();
    logFn({
      id: crypto.randomUUID(),
      method,
      path,
      status: 200,
      resourceType,
      resourceId: result.id,
      timestamp: new Date(),
    });
    return result;
  } catch (error) {
    logFn({
      id: crypto.randomUUID(),
      method,
      path,
      status: (error as { status?: number }).status || 500,
      resourceType,
      timestamp: new Date(),
    });
    throw error;
  }
}

export async function setupDemoSession(
  config: DemoSessionConfig,
  logFn: LogFn
): Promise<Omit<DemoSession, 'config'>> {
  const client = createIncreaseClient(config.apiKey);

  // 1. Create Corporation Entity
  const entity = await loggedRequest(logFn, 'POST', 'entities', () =>
    client.entities.create({
      structure: 'corporation',
      corporation: {
        name: config.companyName,
        tax_identifier: '12-3456789',
        address: {
          line1: '123 Main St',
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
                city: 'San Francisco',
                state: 'CA',
                zip: '94102',
                country: 'US',
              },
              identification: {
                method: 'social_security_number',
                number: '078051120',
              },
            },
            prongs: ['ownership', 'control'],
          },
        ],
      },
    })
  );

  // 2. Create Account linked to Entity
  const account = await loggedRequest(logFn, 'POST', 'accounts', () =>
    client.accounts.create({
      name: 'Operating Account',
      entity_id: entity.id,
    })
  );

  const result: Omit<DemoSession, 'config'> = {
    entity,
    account,
  };

  // 5. Product-specific setup
  if (config.product === 'bill_pay') {
    result.externalAccount = await loggedRequest(
      logFn,
      'POST',
      'external_accounts',
      () =>
        client.externalAccounts.create({
          account_number: '987654321',
          routing_number: '101050001',
          description: 'Vendor Payment Account',
          account_holder: 'business',
          funding: 'checking',
        })
    );
  }

  if (config.product === 'banking') {
    // Phase 1: Create account number, lockbox, and cards in parallel
    const cardData = [
      { description: 'Employee Expenses', merchant: 'UBER EATS', amount: 4523 },
      { description: 'Marketing Budget', merchant: 'GOOGLE ADS', amount: 75000 },
      { description: 'Office Supplies', merchant: 'STAPLES', amount: 12499 },
    ];

    const [accountNumber, lockbox, ...cards] = await Promise.all([
      loggedRequest(logFn, 'POST', 'account_numbers', () =>
        client.accountNumbers.create({
          account_id: account.id,
          name: 'Primary Account Number',
        })
      ),
      loggedRequest(logFn, 'POST', 'lockboxes', () =>
        client.lockboxes.create({
          account_id: account.id,
          description: 'Primary Lockbox',
        })
      ),
      ...cardData.map(({ description }) =>
        loggedRequest(logFn, 'POST', 'cards', () =>
          client.cards.create({
            account_id: account.id,
            description,
          })
        )
      ),
    ]);

    result.accountNumber = accountNumber;
    result.lockbox = lockbox;
    result.cards = cards;

    // Phase 2a: Initial funding via inbound wire ($10,000)
    await loggedRequest(logFn, 'POST', 'simulations/inbound_wire_transfers', () =>
      client.simulations.inboundWireTransfers.create({
        account_number_id: accountNumber.id,
        amount: 1000000,
      })
    );

    // Wait for balance to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Phase 2b: Other seed transactions in parallel
    const [mailItem, achTransfer] = await Promise.all([
      // Inbound mail item with check ($2,500)
      loggedRequest(logFn, 'POST', 'simulations/inbound_mail_items', () =>
        client.simulations.inboundMailItems.create({
          lockbox_id: lockbox.id,
          amount: 250000,
        })
      ),
      // Outbound ACH ($1,200 payroll)
      loggedRequest(logFn, 'POST', 'ach_transfers', () =>
        client.achTransfers.create({
          account_id: account.id,
          amount: 120000,
          routing_number: '101050001',
          account_number: '987654321',
          statement_descriptor: 'Payroll',
        })
      ),
    ]);

    // Submit the check deposit from the mail item
    const checkDepositId = mailItem.checks?.[0]?.check_deposit_id;
    if (checkDepositId) {
      await loggedRequest(logFn, 'POST', `simulations/check_deposits/${checkDepositId}/submit`, () =>
        client.simulations.checkDeposits.submit(checkDepositId)
      );
    }

    // Phase 3: ACH simulation (sequential) and card authorizations (parallel)
    // Only submit if pending_approval or pending_submission
    if (achTransfer.status === 'pending_approval' || achTransfer.status === 'pending_submission') {
      await loggedRequest(logFn, 'POST', `simulations/ach_transfers/${achTransfer.id}/submit`, () =>
        client.simulations.achTransfers.submit(achTransfer.id)
      );
    }
    // Settle after submit
    await loggedRequest(logFn, 'POST', `simulations/ach_transfers/${achTransfer.id}/settle`, () =>
      client.simulations.achTransfers.settle(achTransfer.id, {})
    );

    // Card authorizations in parallel
    const authResults = await Promise.all(
      cards.map((card, i) =>
        loggedRequest(logFn, 'POST', 'simulations/card_authorizations', () =>
          client.simulations.cardAuthorizations.create({
            card_id: card.id,
            amount: cardData[i].amount,
            merchant_descriptor: cardData[i].merchant,
            merchant_category_code: '5999',
          })
        )
      )
    );

    // Phase 4: Settle card authorizations in parallel
    await Promise.all(
      authResults.map((authResult, i) => {
        if (authResult.pending_transaction) {
          return loggedRequest(logFn, 'POST', 'simulations/card_settlements', () =>
            client.simulations.cardSettlements.create({
              card_id: cards[i].id,
              pending_transaction_id: authResult.pending_transaction!.id,
            })
          );
        }
        return Promise.resolve();
      })
    );
  }

  return result;
}

export { getDashboardPath };
