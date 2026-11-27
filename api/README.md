# infloop API

A small, separate backend for the infloop site: creator sign-up and login, and the campaigns a creator is part of. Node.js (Express) on PostgreSQL. The static site in the repository root calls it over HTTPS; nothing here is bundled into the site.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | Checks the API and database |
| POST | `/auth/signup` | – | `{ name, email, password }` → `201 { token, user }` |
| POST | `/auth/login` | – | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Bearer | The signed-in user |
| GET | `/campaigns` | Bearer | Campaigns the signed-in creator is on, active first |

Errors are JSON: `{ "error": "message", "fields": { "email": "…" } }` (`fields` only for validation errors).

Passwords are hashed with bcrypt (cost 12). Login returns a JWT (HS256, 7 days) that the site sends as `Authorization: Bearer <token>`. Auth routes are rate-limited to 30 requests per 15 minutes per IP, and CORS only allows the origins in `CORS_ORIGINS`.

## Data

`migrations/*.sql` are applied once each, in order, on start (or with `npm run migrate`).

- `users`: creator accounts (unique email, case-insensitive).
- `campaigns`: brand, title, goal, platform, deliverables, creator fee, dates.
- `campaign_creators`: which creator is on which campaign, with status `invited`, `active` or `completed`.

`002_sample_campaigns.sql` adds five illustrative campaigns (`is_sample`). Each new account is added to them so the dashboard has data until real campaign assignment exists; the site labels them "Sample".

## Run locally

Requires Node.js 22+ and PostgreSQL 13+.

```sh
docker run -d --name infloop-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=infloop -p 5432:5432 postgres:16-alpine
cd api
npm ci
DATABASE_URL=postgres://postgres:postgres@localhost:5432/infloop npm start   # http://localhost:4000
```

Then run the site from the repository root with `npm run dev`; `.env.development` points it at `http://localhost:4000`.

`npm test` creates and drops a throwaway database on the server in `DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/postgres`).

## Configuration

See `.env.example`: `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET` (required in production, 32+ characters), `CORS_ORIGINS`, `PORT`.

## Deploy

Any Node host with a PostgreSQL database works. `render.yaml` in the repository root describes a Render web service and database. After deploying, put the API's public URL in `.env.production` in the repository root as `VITE_API_URL=…` so the GitHub Pages build points at it.
