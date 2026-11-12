# Deployment

## Frontend

The current project is Next.js, so deploy it to Vercel, Netlify Next runtime, a Node host, or a container.

```bash
npm install
npm run build:web
npm run start
```

Set `NEXT_PUBLIC_API_BASE_URL` to the production API base URL, for example `https://api.example.com/api/v1`.

## API

Deploy `apps/api` to a Node.js host such as Render, Railway, ECS, App Runner, or a VPS.

```bash
npm install
npm run db:generate
npm run build:api
npm run start:api
```

Configure:

- `DATABASE_URL` with least-privilege MySQL credentials.
- `FRONTEND_URL` for CORS.
- `SESSION_SECRET`, `CRON_SECRET`, `MANAGE_BOOKING_TOKEN_SECRET`, and `ICAL_FEED_SECRET` with long random values.
- PayHere and email variables.

## MySQL

Use managed MySQL where possible. Run migrations during release:

```bash
npm run db:migrate
```

Back up the database daily. Keep booking, payment, and audit tables in backups for the legally required retention period.

## Reverse Proxy

Terminate HTTPS at the platform load balancer or Nginx. Forward `X-Forwarded-Proto` and keep API body limits small for public endpoints.
