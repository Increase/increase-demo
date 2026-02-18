import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import App from '../App';

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
}

describe('Bill Pay Flow', () => {
  it('creates an ACH payment and settles it through both debit and credit legs', async () => {
    const user = userEvent.setup();
    renderApp();

    // Step 1: Complete setup form
    const apiKeyInput = screen.getByPlaceholderText(/sandbox api key/i);
    const companyNameInput = screen.getByPlaceholderText(/company name/i);

    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'test_api_key_123');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Test Company');

    // Select Bill Pay product (since Banking is now default)
    const productLabel = screen.getByText('Product');
    const productWrapper = productLabel.closest('.mantine-Select-root') || productLabel.parentElement;
    const productInput = productWrapper?.querySelector('input');
    await user.click(productInput!);
    await waitFor(() => {
      expect(screen.getByText('Bill Pay')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Bill Pay'));

    const createSessionButton = screen.getByRole('button', { name: /create demo session/i });
    await user.click(createSessionButton);

    // Wait for session to be created and Bill Pay view to appear
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText('Bill Pay')).toBeInTheDocument();

    // Step 2: Create a new payment
    const newPaymentButton = screen.getByRole('button', { name: /new payment/i });
    await user.click(newPaymentButton);

    // Wait for modal to open - look for the modal title text
    await waitFor(() => {
      expect(screen.getByText('Create Bill Payment')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Step 3: Fill out the payment form
    // Find the Select component by its label and click it
    const fundingSourceLabel = screen.getByText(/funding source/i);
    const fundingSourceWrapper = fundingSourceLabel.closest('.mantine-Select-root') || fundingSourceLabel.parentElement;
    const selectInput = fundingSourceWrapper?.querySelector('input');
    expect(selectInput).toBeInTheDocument();
    await user.click(selectInput!);

    // Wait for dropdown and select the option
    await waitFor(() => {
      expect(screen.getByText(/customer external account/i)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/customer external account/i));

    // Enter amount
    const amountLabel = screen.getByText('Amount ($)');
    const amountWrapper = amountLabel.closest('.mantine-NumberInput-root') || amountLabel.parentElement;
    const amountInput = amountWrapper?.querySelector('input');
    expect(amountInput).toBeInTheDocument();
    await user.type(amountInput!, '100');

    // ACH is selected by default, fill in the demo data
    const fillDemoDataButton = screen.getByRole('button', { name: /fill demo data/i });
    await user.click(fillDemoDataButton);

    // Submit the payment
    const createPaymentButton = screen.getByRole('button', { name: /create payment/i });
    await user.click(createPaymentButton);

    // Wait for modal to close and payment to appear in list
    await waitFor(() => {
      expect(screen.queryByText('Create Bill Payment')).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // Step 4: Click on the payment to view details
    await waitFor(() => {
      expect(screen.getByText('$100')).toBeInTheDocument();
    });

    const paymentCard = screen.getByText('$100').closest('[class*="cursor-pointer"]');
    expect(paymentCard).toBeInTheDocument();
    await user.click(paymentCard!);

    // Wait for detail view to load
    await waitFor(() => {
      expect(screen.getByText(/back to list/i)).toBeInTheDocument();
    });

    // Step 5: Click "Settle Debit" button to settle debit and create credit
    const settleDebitButton = await screen.findByRole('button', { name: /settle debit/i });
    await user.click(settleDebitButton);

    // Wait for status to change to credit_submitted
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /settle credit/i })).toBeInTheDocument();
    }, { timeout: 10000 });

    // Step 6: Click "Settle Credit" button to complete the payment
    const settleCreditButton = screen.getByRole('button', { name: /settle credit/i });
    await user.click(settleCreditButton);

    // Wait for payment to be completed
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
