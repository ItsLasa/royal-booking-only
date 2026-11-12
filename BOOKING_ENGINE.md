# Booking Engine

Royal Mansion Resort Villa now has a separate booking API under `apps/api` and booking-facing Next.js pages under `src/app/book`, while preserving the existing Next.js site and styling.

## Architecture

- Existing frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion.
- Added backend: Node.js, Express, Prisma, MySQL, Zod, PayHere provider abstraction.
- API namespace: `/api/v1`.
- Inventory model separates physical `Unit` from sellable `Package`, so multiple packages can share the same villa without separate availability.

## Local Setup

```bash
npm install
cp .env.example .env
# edit DATABASE_URL and secrets
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend: `http://localhost:3000`
API: `http://localhost:4000`

## Important Commands

```bash
npm run dev:web
npm run dev:api
npm run typecheck
npm run test
npm run test:unit
npm run test:integration
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:api
```

## Booking Safety

Availability uses the standard overlap rule: `existingCheckIn < requestedCheckOut` and `existingCheckOut > requestedCheckIn`. Booking hold creation recalculates price and availability inside a Prisma transaction with serializable isolation. Cancelled and expired bookings are not counted as occupied inventory. Holds expire through `POST /api/v1/cron/expire-holds` with `x-cron-secret`.

## API Endpoints

Public:

- `GET /api/v1/public/packages`
- `GET /api/v1/public/packages/:slug`
- `POST /api/v1/availability/search`
- `POST /api/v1/quotes`
- `POST /api/v1/bookings/hold`
- `GET /api/v1/bookings/:reference/status`
- `POST /api/v1/bookings/:reference/cancellation-request`
- `POST /api/v1/payments/payhere/create`
- `POST /api/v1/payments/payhere/notify`
- `POST /api/v1/payments/bank-transfer`
- `GET /api/v1/calendar/:token.ics`

Admin endpoints require a valid signed HTTP-only `rmv_admin_session` cookie. Sessions are stored as SHA-256 token hashes in `AdminSession` and can be revoked by logout.

## Production Gaps

PayHere live payment cannot be claimed working until live merchant credentials and a public HTTPS notify URL are configured and tested. Email delivery is documented but not connected to Resend yet. Admin authentication has protected endpoint scaffolding, but not a full login/session UI.

