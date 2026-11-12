# Royal Mansion Resort Villa

Luxury villa website with an added direct booking engine foundation.

See:

- `BOOKING_ENGINE.md` for architecture, setup, commands, and API endpoints.
- `PAYHERE_SETUP.md` for sandbox/live payment configuration.
- `DEPLOYMENT.md` for frontend, API, MySQL, and HTTPS deployment notes.
- `ADMIN_GUIDE.md` for operational workflows.

Quick start:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

No real secrets are included in this repository.
