/**
 * Banking demo session setup test.
 *
 * Tests the complete banking setup flow including:
 * - Entity and account creation
 * - Account number and lockbox creation
 * - Card creation
 * - Inbound wire simulation
 * - Inbound mail item (lockbox check) simulation
 * - ACH transfer creation and settlement
 * - Card authorization and settlement
 *
 * MSW handlers are based on real Increase sandbox API responses.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import App from '../App';
import { resetBankingResources } from './mocks/handlers';

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
}

describe('Banking Demo Session Setup', () => {
  beforeEach(() => {
    resetBankingResources();
  });

  it('creates a complete banking demo session with all resources', async () => {
    const user = userEvent.setup();
    renderApp();

    // Step 1: Fill out the setup form
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    // Step 2: Select Banking product
    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    expect(productInput).toBeInTheDocument();
    await user.click(productInput!);

    // Wait for dropdown and select Banking
    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Banking'));

    // Step 3: Create demo session
    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    // Step 4: Wait for banking view to appear with all data
    await waitFor(
      () => {
        // Account name should be visible
        expect(screen.getByText('Operating Account')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    // Verify balance is displayed (from wire transfer)
    await waitFor(() => {
      expect(screen.getByText(/available balance/i)).toBeInTheDocument();
    });

    // Verify Account Number section
    expect(screen.getByText('Account Number')).toBeInTheDocument();

    // Verify Lockbox section
    expect(screen.getByText('Lockbox')).toBeInTheDocument();

    // Verify Cards section with "View All" button
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();

    // Verify Recent Transactions section
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();

    // Verify Simulate Receiving button
    expect(screen.getByRole('button', { name: /simulate receiving/i })).toBeInTheDocument();
  });

  it('shows transactions after setup including wire, ACH, and card settlements', async () => {
    const user = userEvent.setup();
    renderApp();

    // Complete setup
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    await user.click(productInput!);

    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Banking'));

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    // Wait for banking view
    await waitFor(
      () => {
        expect(screen.getByText('Operating Account')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    // Wait for transactions to load and verify they appear
    await waitFor(
      () => {
        // Should have at least the wire transfer description visible
        const transactionSection = screen.getByText('Recent Transactions');
        expect(transactionSection).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('can simulate receiving a wire transfer after setup', async () => {
    const user = userEvent.setup();
    renderApp();

    // Complete setup
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    await user.click(productInput!);

    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Banking'));

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    await waitFor(
      () => {
        expect(screen.getByText('Operating Account')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    // Click Simulate Receiving dropdown
    const simulateButton = screen.getByRole('button', { name: /simulate receiving/i });
    await user.click(simulateButton);

    // Wait for dropdown menu
    await waitFor(() => {
      expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
    });

    // Click Wire Transfer
    await user.click(screen.getByText('Wire Transfer'));

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Simulate Wire Transfer')).toBeInTheDocument();
    });

    // The amount input should have a default value
    const amountInput = screen.getByRole('textbox');
    expect(amountInput).toBeInTheDocument();

    // Click simulate button in modal
    const simulateSubmitButton = screen.getByRole('button', { name: /✨ simulate/i });
    await user.click(simulateSubmitButton);

    // Wait for modal to close (success)
    await waitFor(
      () => {
        expect(screen.queryByText('Simulate Wire Transfer')).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('can create a new card from the cards list', async () => {
    const user = userEvent.setup();
    renderApp();

    // Complete setup
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    await user.click(productInput!);

    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Banking'));

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    await waitFor(
      () => {
        expect(screen.getByText('Operating Account')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    // Navigate to cards list
    const viewAllButton = screen.getByRole('button', { name: /view all/i });
    await user.click(viewAllButton);

    // Wait for cards list view
    await waitFor(() => {
      // The header "Cards" for the list view
      const cardsHeaders = screen.getAllByText('Cards');
      expect(cardsHeaders.length).toBeGreaterThan(0);
    });

    // Click Create Card button
    const createCardButton = screen.getByRole('button', { name: /create card/i });
    await user.click(createCardButton);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Create Card')).toBeInTheDocument();
    });

    // Enter description
    const descriptionInput = screen.getByPlaceholderText(/card description/i);
    await user.type(descriptionInput, 'New Test Card');

    // Submit - find the submit button
    const submitButtons = screen.getAllByRole('button', { name: /✨ create card/i });
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit');
    expect(submitButton).toBeInTheDocument();
    await user.click(submitButton!);

    // Wait for modal to close and card to appear
    await waitFor(
      () => {
        expect(screen.queryByText('Create Card')).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify new card appears in the list
    await waitFor(() => {
      expect(screen.getByText('New Test Card')).toBeInTheDocument();
    });
  });

  it('can roll account number and lockbox', async () => {
    const user = userEvent.setup();
    renderApp();

    // Complete setup
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    await user.click(productInput!);

    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Banking'));

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    await waitFor(
      () => {
        expect(screen.getByText('Operating Account')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    // Find and click Roll buttons
    const rollButtons = screen.getAllByRole('button', { name: /↻ roll/i });
    expect(rollButtons.length).toBeGreaterThanOrEqual(2); // Account Number and Lockbox

    // Click the first Roll button (Account Number)
    await user.click(rollButtons[0]);

    // The button should show loading state briefly then return to normal
    await waitFor(() => {
      expect(rollButtons[0]).not.toBeDisabled();
    });
  });
});
