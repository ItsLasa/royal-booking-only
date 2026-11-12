# Admin Guide

## Initial Login

Seed creates a development owner from:

```env
ADMIN_SEED_EMAIL=owner@example.test
ADMIN_SEED_PASSWORD=ChangeMe123!
```

Change these before real use. The admin UI at `/admin` uses password login and a signed HTTP-only `rmv_admin_session` cookie backed by the `AdminSession` database table. Use HTTPS in production so the secure cookie is enforced.

## Booking Management

Use `/admin` for the dashboard surface. API endpoints expose bookings, calendar, payments, reports, package data, and availability blocks.

Bank transfers should remain `PENDING_PAYMENT` until an owner or manager verifies the bank receipt. Do not edit verified PayHere amounts manually.

## Rates and Blocks

Create seasonal rates for broad date ranges and date overrides for specific dates. Use availability blocks for owner stays, renovations, and private events.

## Calendar Feed

Each property has a private calendar feed token. Use:

```text
/api/v1/calendar/{token}.ics
```

The feed includes only booking references and blocked dates, not private guest details.

