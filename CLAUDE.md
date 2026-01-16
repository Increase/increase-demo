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
│   └── BillPaymentContext.tsx  # Bill payment state
└── components/
    ├── SetupScreen.tsx         # API key & config form
    ├── DemoLayout.tsx          # Split-screen wrapper
    ├── DebugPanel.tsx          # API requests panel
    ├── BillPayView.tsx         # Bill Pay main view
    ├── BillPaymentList.tsx     # Payment list
    ├── BillPaymentDetail.tsx   # Payment detail with timeline
    └── CreateBillPaymentModal.tsx  # New payment modal
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

## Demo Session Setup

On start, automatically creates:
1. Corporation Entity (demo data)
2. Account linked to Entity
3. External Account (funding source for bill payments)

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
