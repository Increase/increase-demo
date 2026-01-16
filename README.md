# Increase Demo

A client-side demo application for showcasing the [Increase](https://increase.com) banking API. Runs entirely in the browser, connecting to the Increase sandbox environment.

## Features

- **Bill Pay** - Two-legged payment flow with debit from external account and credit to vendor
- **Multiple Payment Networks** - ACH, Wire, RTP, Check, and Card
- **Timeline View** - Visual progress tracking for each payment
- **Debug Panel** - Live API request logging with links to Increase Dashboard
- **Sandbox Simulations** - Buttons to simulate settlement, authorization, and other events

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open http://localhost:5173 and enter your Increase sandbox API key.

## Environment Variables

Create a `.env` file to prefill the setup form:

```
VITE_INCREASE_API_KEY=your_sandbox_api_key
VITE_COMPANY_NAME=Your Company Name
```

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Mantine UI
- Tailwind CSS v4
- Increase TypeScript SDK

## How It Works

### CORS Proxy

The Increase API doesn't allow browser CORS requests. Vite's dev server proxies `/api/*` to `https://sandbox.increase.com`.

### Payment Flow

1. User creates a bill payment, selecting amount and payment network
2. **Debit leg**: ACH transfer pulls funds from an external account
3. **Credit leg**: Funds sent to vendor via selected network (ACH/Wire/RTP/Check/Card)
4. Simulation buttons advance the payment through settlement states

### Demo Session

On start, the app automatically creates:
- A Corporation Entity
- An Account linked to the Entity
- An External Account (funding source)

## License

MIT
