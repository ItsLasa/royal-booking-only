# PayHere Setup

Use sandbox first. Configure these server-only variables in `.env`:

```env
PAYHERE_MODE=sandbox
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_NOTIFY_URL=https://api.example.com/api/v1/payments/payhere/notify
PAYHERE_RETURN_URL=https://www.example.com/book/success
PAYHERE_CANCEL_URL=https://www.example.com/book/cancelled
```

Rules implemented:

- Checkout values and hash are generated on the Express API.
- Merchant secret is never exposed to browser variables.
- Browser return URL never confirms a booking.
- `/api/v1/payments/payhere/notify` verifies merchant, order, payment ID, amount, currency, status, and checksum.
- Duplicate callbacks are recorded idempotently.

Production checklist:

1. Use HTTPS for frontend and API.
2. Set `PAYHERE_MODE=live` only after PayHere approves the merchant account.
3. Configure the exact public notify URL in PayHere.
4. Test a deposit and full-payment callback.
5. Confirm failed callbacks do not release paid bookings.
