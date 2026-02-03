# Retailer Ordering Portal

Production-ready web portal for retailers to place orders that sync directly to Linnworks via API.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Magic link (passwordless)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone and install dependencies:

```bash
cd retailer-portal
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database URL and other settings
```

3. Run database migrations and seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

5. Visit http://localhost:3000 and log in with:
   - Email: `buyer@retailer.example.com`
   - Check the console for the magic link (in dev mode)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `LINNWORKS_APP_ID` | No | - | Linnworks application ID (mock mode if empty) |
| `LINNWORKS_APP_SECRET` | No | - | Linnworks application secret |
| `LINNWORKS_INSTALL_TOKEN` | No | - | Linnworks install token |
| `PRICES_SOURCE` | No | `PORTAL` | Where prices come from: `PORTAL` or `LINNWORKS` |
| `TAX_MODE` | No | `INCLUSIVE` | Tax mode: `INCLUSIVE` or `EXCLUSIVE` |
| `ORDER_UNITS` | No | `CASES_ONLY` | Unit enforcement: `CASES_ONLY` or `EACHES_ALLOWED` |
| `MAGIC_LINK_EXPIRY_MINUTES` | No | `15` | Magic link expiration time |
| `SESSION_EXPIRY_DAYS` | No | `7` | Session cookie lifetime |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Base URL for magic links |

## Linnworks Mock Mode

If `LINNWORKS_APP_ID`, `LINNWORKS_APP_SECRET`, or `LINNWORKS_INSTALL_TOKEN` are not set, the system automatically uses a mock Linnworks client that:

- Simulates successful order creation
- Returns fake `pkOrderId` (UUID)
- Logs operations to console

## Features

### For Retailers

- **Magic link authentication** - No passwords, secure email login
- **Product catalog** - View available SKUs with prices
- **Shopping cart** - Add/remove items, adjust quantities
- **Checkout** - Add PO number, notes, delivery date
- **Order history** - View all past orders with status

### For Admins

- **All orders view** - See orders from all retailers
- **Retry failed orders** - Manually retry Linnworks sync
- **Event logs** - View detailed order events and payloads

## Idempotency

Orders are protected against duplicate submissions using a deterministic `externalRef`:

- Format: `RP-{YYYYMMDD}-{8-char-hash}`
- Hash based on: retailer ID, sorted line items, PO number, delivery date
- Same cart contents = same `externalRef` = same order returned

This prevents issues from:
- Double-clicks
- Browser refresh during submission
- Network retries

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/magic-link` | Request magic link email |
| `GET` | `/api/auth/verify?token=x` | Verify magic link, create session |
| `POST` | `/api/auth/logout` | Destroy session |
| `GET` | `/api/catalog` | Get retailer's available SKUs |
| `POST` | `/api/orders` | Create new order |
| `GET` | `/api/orders` | List retailer's orders |
| `GET` | `/api/orders/[id]` | Get order details |
| `GET` | `/api/admin/orders` | List all orders (admin) |
| `POST` | `/api/admin/orders/[id]/retry` | Retry failed order (admin) |
| `GET` | `/api/admin/logs` | Get event logs (admin) |

## Validation Rules

1. Retailer must be active
2. SKU must be active AND assigned to retailer
3. Quantity must be > 0
4. If `ORDER_UNITS=CASES_ONLY`: quantity must be multiple of pack size

## Security

- Session cookies: `HttpOnly`, `Secure` (production), `SameSite=Strict`
- Magic links: 15-minute expiry, single-use
- Sensitive data redaction in logs (tokens, secrets, passwords)
- All secrets from environment variables only

## Seed Data

The seed script creates:

- 1 Retailer: "Demo Retailer" (code: DEMO001)
- 1 Buyer: buyer@retailer.example.com
- 1 Admin: admin@portal.example.com
- 10 SKUs: BENTO-001 to DRINK-001 with varying pack sizes

## Production Deployment

1. Set all environment variables
2. Use a proper PostgreSQL database
3. Configure Linnworks credentials
4. Implement real email sending in `src/lib/email/index.ts`
5. Run `npm run build && npm run start`

## Project Structure

```
retailer-portal/
├── prisma/
│   ├── schema.prisma       # Data model
│   └── seed.ts             # Seed data
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login/verify pages
│   │   ├── (portal)/       # Retailer pages
│   │   ├── (admin)/        # Admin pages
│   │   └── api/            # API routes
│   ├── lib/
│   │   ├── prisma.ts       # Prisma singleton
│   │   ├── config.ts       # Configuration
│   │   ├── auth/           # Session, magic-link
│   │   ├── email/          # Email sending
│   │   ├── linnworks/      # Linnworks integration
│   │   ├── orders/         # Order service
│   │   └── utils/          # Logging utilities
│   └── components/         # React components
├── .env.example            # Environment template
└── README.md
```
