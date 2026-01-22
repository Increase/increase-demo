# Increase Demo App

## Purpose

A client-side demo application for showcasing the [Increase](https://increase.com) banking API. Runs entirely in the browser on localhost, connecting to the Increase sandbox environment.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Mantine (self-contained styling, works out of the box)
- **Styling**: Tailwind CSS v4 (layout utilities only)
- **API Client**: Increase TypeScript SDK
- **Package Manager**: pnpm

## Architecture

### CORS Proxy

The Increase API doesn't allow browser CORS requests. Vite's dev server proxies `/api/*` to `https://sandbox.increase.com`. The Increase SDK uses `baseURL: ${window.location.origin}/api`.

### State Management

React Context for global state:
- `ApiLogContext` - Tracks API requests for debug panel
- `BillPaymentContext` - Bill payment state and operations
- `BankingContext` - Banking state (account, transactions, cards, etc.)

### Layout

Split-screen layout:
- **Left**: End-user experience
- **Right**: Debug panel with API requests and "Open in Dashboard" links

## Project Structure

```
src/
├── App.tsx                     # Main app, session state
├── main.tsx                    # React entry point, MantineProvider
├── types.ts                    # TypeScript types
├── lib/
│   └── increase.ts             # Increase client, setupDemoSession()
├── context/
│   ├── ApiLogContext.tsx       # API request logging
│   ├── BillPaymentContext.tsx  # Bill payment state
│   └── BankingContext.tsx      # Banking state and operations
└── components/
    ├── SetupScreen.tsx         # API key & config form
    ├── DemoLayout.tsx          # Split-screen wrapper
    ├── DebugPanel.tsx          # API requests panel
    ├── BillPayView.tsx         # Bill Pay main view
    ├── BillPaymentList.tsx     # Payment list
    ├── BillPaymentDetail.tsx   # Payment detail with timeline
    ├── CreateBillPaymentModal.tsx  # New payment modal
    ├── BankingView.tsx         # Banking main view (navigation state)
    ├── BankingOverview.tsx     # Banking overview with account details
    ├── TransactionDetail.tsx   # Single transaction view
    ├── LockboxDetail.tsx       # Lockbox info and transactions
    ├── CardsListView.tsx       # List of cards
    ├── CardDetail.tsx          # Card info and transactions
    ├── CreateCardModal.tsx     # Modal to create new card
    └── SimulateInboundModal.tsx # Modal for simulating inbound transfers
```

## Bill Pay Product

### Payment Flow

Two-legged payment with settlement simulation:

1. **Create Payment** - User fills form, selects network (ACH/RTP/Wire/Check/Card)
2. **Debit Leg** - ACH transfer pulls funds from external account
3. **Settlement** - Simulation button advances the payment
4. **Credit Leg** - Funds sent to vendor via selected network

### Payment Detail View

The detail view shows:
- **Header**: Amount, status badge, simulation button (upper right)
- **Details**: Network, created date, network-specific info
- **Timeline**: Visual progress with completed/current/pending steps

### Timeline by Network

```
All networks start with:
  ● Debit initiated
  ● Debit settled

Then varies by network:
  ACH:   ● ACH credit submitted → ● ACH credit settled
  Wire:  ● Wire sent (instant)
  RTP:   ● RTP sent (instant)
  Check: ● Check mailed → ● Check deposited
  Card:  ● Card created → ● Card authorized
```

### Payment States

```
pending_debit → debit_processing → pending_credit → ...network-specific... → completed
                      ↓
                 debit_failed / failed
```

### Increase API Calls

**Debit Leg:**
- `achTransfers.create()` - Debit from external account (negative amount)
- `simulations.achTransfers.settle()` - Simulate debit settlement

**Credit Leg by Network:**
- **ACH**: `achTransfers.create()` → `simulations.achTransfers.submit()` → `simulations.achTransfers.settle()`
- **Wire**: `wireTransfers.create()` → `simulations.wireTransfers.submit()` (instant)
- **RTP**: `accountNumbers.create()` → `realTimePaymentsTransfers.create()` → `simulations.realTimePaymentsTransfers.complete()` (instant)
- **Check**: `accountNumbers.create()` → `checkTransfers.create()` → `simulations.checkTransfers.mail()` → `simulations.inboundCheckDeposits.create()`
- **Card**: `cards.create()` → `simulations.cardAuthorizations.create()`

## Banking Product

### Overview

The Banking product demonstrates core banking features: account overview, transactions, account numbers, lockboxes, and cards.

### Navigation Flow

```
BankingView (manages viewState)
├── BankingOverview (default)
│   ├── Account info + balance
│   ├── Account Number (with Roll button)
│   ├── Lockbox address (clickable, with Roll button)
│   ├── Cards preview (3 cards, View All button)
│   ├── Recent transactions (clickable)
│   └── Simulate Receiving dropdown (Wire/ACH/Check)
├── TransactionDetail ← click transaction
├── LockboxDetail ← click lockbox section
├── CardsListView ← click "View All"
│   └── CreateCardModal
└── CardDetail ← click card
```

### Demo Session Setup (Banking)

Creates resources in parallel phases for speed:

**Phase 1** (parallel):
- Account Number
- Lockbox
- 3 Cards (Employee Expenses, Marketing Budget, Office Supplies)

**Phase 2** (parallel):
- Inbound wire transfer ($10,000) - initial funding
- Inbound mail item with check ($2,500) - to lockbox
- Outbound ACH transfer ($1,200) - payroll

**Phase 3** (parallel):
- ACH submit/settle
- 3 Card authorizations (UBER EATS $45.23, GOOGLE ADS $750, STAPLES $124.99)

**Phase 4** (parallel):
- 3 Card settlements

### Increase API Calls (Banking)

**Account Management:**
- `accounts.retrieve()` - Get account with balance
- `accountNumbers.list()` / `accountNumbers.create()` - Manage account numbers
- `lockboxes.list()` / `lockboxes.create()` - Manage lockboxes
- `transactions.list()` - List transactions
- `cards.list()` / `cards.create()` - Manage cards

**Simulations:**
- `simulations.inboundWireTransfers.create()` - Simulate receiving wire
- `simulations.inboundACHTransfers.create()` - Simulate receiving ACH
- `simulations.inboundMailItems.create()` - Simulate check to lockbox
- `simulations.inboundCheckDeposits.create()` - Simulate check deposit
- `simulations.cardAuthorizations.create()` - Simulate card purchase
- `simulations.cardSettlements.create()` - Settle card authorization

### UI Conventions

- **Simulation buttons**: Violet color with ✨ emoji (magical demo actions)
- **Product buttons**: Blue color with ↻ for Roll buttons (hypothetical product features)
- **Money display**: `$${(cents / 100).toLocaleString()}` with green/red for positive/negative
- **Cards**: `shadow="sm" padding="lg" radius="md" withBorder`

## Demo Session Setup

On start, automatically creates:
1. Corporation Entity (demo data)
2. Account linked to Entity
3. Product-specific resources:
   - **Bill Pay**: External Account (funding source)
   - **Banking**: Account Number, Lockbox, 3 Cards, and demo transactions (see Banking Product section)

## Environment Variables

Optional `.env` to prefill setup form:

```
VITE_INCREASE_API_KEY=your_sandbox_api_key
VITE_COMPANY_NAME=Your Company Name
```

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173/
pnpm build      # Production build
pnpm exec tsc --noEmit  # Type check
pnpm test       # Run tests
```

## Testing

Tests use Vitest + React Testing Library with MSW for API mocking. Run `pnpm test` to verify changes work correctly.

**Always run tests after making changes** to ensure nothing is broken. The test suite covers the complete bill pay flow including payment creation and settlement.

Test files:
- `src/test/setup.ts` - Test setup with MSW and jsdom mocks
- `src/test/mocks/handlers.ts` - MSW handlers for Increase API
- `src/test/bill-pay.test.tsx` - Bill pay flow integration test

## Deployment

Deploy to Vercel by connecting the GitHub repo. The `vercel.json` configures rewrites to proxy `/api/*` requests to the Increase sandbox API.

```bash
pnpm build      # Test production build locally
```

## Key Implementation Details

- ACH debit uses **negative amount** to pull FROM external account
- RTP and Check require creating an Account Number on-demand
- Card payments store `cardId` and `cardLast4` for display
- Check payments store `checkNumber` and `sourceAccountNumberId` for deposit simulation
- Dashboard links map resource types to URL paths (transfers use `/transfers` prefix)
