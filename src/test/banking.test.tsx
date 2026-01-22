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

describe('Banking Flow', () => {
  beforeEach(() => {
    resetBankingResources();
  });

  it('displays the banking overview and can simulate receiving a wire transfer', async () => {
    const user = userEvent.setup();
    renderApp();

    // Step 1: Complete setup form with Banking product selected
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    // Select Banking product
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

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    // Wait for session to be created and Banking view to appear
    await waitFor(() => {
      expect(screen.getByText('Operating Account')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify we see the balance
    await waitFor(() => {
      expect(screen.getByText(/available balance/i)).toBeInTheDocument();
    });

    // Verify account number section exists
    expect(screen.getByText('Account Number')).toBeInTheDocument();

    // Verify lockbox section exists
    expect(screen.getByText('Lockbox')).toBeInTheDocument();

    // Verify recent transactions section exists
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();

    // Step 2: Test the simulate receiving dropdown
    const simulateButton = screen.getByRole('button', { name: /simulate receiving/i });
    await user.click(simulateButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
    });

    // Click Wire Transfer
    await user.click(screen.getByText('Wire Transfer'));

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Simulate Wire Transfer')).toBeInTheDocument();
    });

    // Enter amount (default should be there, but let's verify and submit)
    const amountInput = screen.getByRole('textbox');
    expect(amountInput).toBeInTheDocument();

    // Click simulate button in modal
    const simulateSubmitButton = screen.getByRole('button', { name: /✨ simulate/i });
    await user.click(simulateSubmitButton);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText('Simulate Wire Transfer')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('can navigate to the cards list and create a card', async () => {
    const user = userEvent.setup();
    renderApp();

    // Complete setup form with Banking product
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Banking Company');

    // Select Banking product
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

    // Wait for Banking view
    await waitFor(() => {
      expect(screen.getByText('Operating Account')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Click View All button to go to cards list
    const viewAllButton = screen.getByRole('button', { name: /view all/i });
    await user.click(viewAllButton);

    // Wait for cards list view
    await waitFor(() => {
      expect(screen.getByText('Cards')).toBeInTheDocument();
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
    await user.type(descriptionInput, 'Test Virtual Card');

    // Submit - the modal has a submit button, the other is type="button"
    const submitButtons = screen.getAllByRole('button', { name: /✨ create card/i });
    const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
    expect(submitButton).toBeInTheDocument();
    await user.click(submitButton!);

    // Wait for modal to close and card to appear
    await waitFor(() => {
      expect(screen.queryByText('Create Card')).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify card appears in the list
    await waitFor(() => {
      expect(screen.getByText('Test Virtual Card')).toBeInTheDocument();
    });
  });
});
