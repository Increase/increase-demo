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

  return result;
}

export { getDashboardPath };
