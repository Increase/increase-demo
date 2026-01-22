/**
 * MSW handlers for Increase API mocking.
 * Combines bill pay and banking handlers.
 */
import { bankingHandlers, resetBankingState } from './banking-handlers';

// Re-export reset function
export function resetBankingResources() {
  resetBankingState();
}

// Export all handlers
export const handlers = [...bankingHandlers];
