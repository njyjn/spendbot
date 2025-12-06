# SpendBot

A personal expense tracking bot with AI-powered receipt recognition and natural language processing.

## Features

- **AI Receipt Recognition**: Upload receipt photos to automatically extract expense details (payee, amount, category, payment method)
- **Natural Language Expense Parsing**: Record expenses using natural language (e.g., "Spent $10 at NTUC with my card")
- **Dual AI Providers**: Uses Google Gemini as primary provider with OpenAI fallback
- **Telegram Bot Integration**: Record and manage expenses via Telegram messages and photos
- **Google Sheets Integration**: Dynamically fetch categories and payment methods from Google Sheets with 5-minute caching
- **PostgreSQL Backend**: Secure expense storage with user attribution
- **Web Dashboard**: View expense summaries and analytics

## Tech Stack

- **Frontend**: Next.js 15.0.3, React 18, TailwindCSS
- **Backend**: Next.js API Routes, PostgreSQL with Kysely ORM
- **AI**: Google Gemini 2.0 Flash (primary), OpenAI GPT-4o (fallback)
- **Telegram**: Telegraf bot framework with webhook support
- **Auth**: Auth0
- **Testing**: Jest with TypeScript support
- **Node**: 24.x or higher

## Setup

### Prerequisites

- Node.js 24.x or higher
- PostgreSQL database
- Google Cloud Service Account (for Sheets API)
- Google Gemini API key
- Telegram Bot Token
- Auth0 credentials

### Environment Variables

See `.env.sample` for all required variables:

```bash
# Core
TELEGRAM_BOT_TOKEN=your_bot_token
BASE_PATH=https://your-domain.com/spend

# AI
GEMINI_API_KEY=your_gemini_key
GEMINI_TEXT_MODEL=gemini-2.0-flash
GEMINI_VISION_MODEL=gemini-2.0-flash

# Optional OpenAI fallback
OPENAI_API_KEY=your_openai_key

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account",...}

# Database
POSTGRES_URL=postgresql://...

# Auth0
AUTH0_SECRET=your_secret
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_BASE_URL=http://localhost:3000/spend
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000/spend](http://localhost:3000/spend)

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Usage

### Recording Expenses

#### Via Telegram Photo
Send a photo of a receipt to the bot. The AI will extract details (date, payee, amount, category, payment method).

#### Via Telegram Text
Send natural language messages like:
- "Spent $10.50 at NTUC with OCBC365"
- "Bought coffee for $5 at Starbucks"
- "Paid $30 for groceries, cash"

#### Web Dashboard
Use the web interface to manually record or review expenses.

## Architecture

### AI Provider Routing (`lib/ai.ts`)
- Routes to Gemini if `GEMINI_API_KEY` is set
- Falls back to OpenAI if Gemini unavailable
- Provides unified interface for `completeChat()` and `analyzeReceipt()`

### Receipt Analysis
- Vision model extracts details from receipt images
- Uses defined categories and payment methods from Google Sheets
- Special handling: PayNow → Cash, Shopback → UNKNOWN (unless card inferred)

### NLP Parsing (`lib/nlp.ts`)
- Converts natural language to structured expense data
- Validates against sheet definitions
- Caches definitions for 5 minutes to reduce API calls
- Includes markdown response handling for AI variations

### Definitions Caching (`pages/api/definitions.ts`)
- Fetches categories and payment methods from Google Sheets
- 5-minute cache TTL to minimize sheet API calls
- Used by both receipt recognition and NLP features

## Deployment

### Vercel

1. Set Node.js version: Created `.node-version` file with `24`
2. Set environment variables in Vercel dashboard
3. Deploy via git push:

```bash
git push origin main
```

The `.node-version` file ensures Vercel uses Node.js 24.x for builds.

## Testing

The project includes comprehensive Jest tests for NLP parsing:

```bash
npm test
```

Tests cover:
- Successful expense parsing with all fields
- Missing field handling (UNKNOWN defaults)
- Date inference and null handling
- Markdown code block stripping
- User lookup from database
- Error handling and edge cases

## Troubleshooting

### Receipt Recognition Failing
- Verify `GEMINI_API_KEY` is set and valid
- Check image quality (clear, well-lit receipts work best)
- Ensure definitions are loaded from Google Sheets

### NLP Not Working
- Verify expense keywords are detected (spent, expense, cost, paid, buy, purchase, $, sgd)
- Check definitions are loaded from sheet
- Ensure user has matching Telegram ID in database

### Telegram Webhook Issues
- Update webhook URL: Use the "Set Telegram Webhook" button in `/spend/god` page
- Verify `BASE_PATH` matches your actual domain
- Check Telegram bot token is correct

## License

MIT

