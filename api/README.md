# infloop API

A small, separate backend for the infloop site: creator sign-up and login, and the campaigns a creator is part of. Node.js (Express) on PostgreSQL. The static site in the repository root calls it over HTTPS; nothing here is bundled into the site.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | Checks the API and database |
| POST | `/auth/signup` | – | `{ name, email, password }` → `202 { email, message }`; emails a verification link, no session |
| POST | `/auth/verify` | – | `{ token, password }`: the token from the emailed link plus the sign-up password → activates the account |
| POST | `/auth/resend-verification` | – | `{ email }` → sends a new link if the account is unverified |
| POST | `/auth/login` | – | `{ email, password }` → `{ token, user }`; `403` with `code: "email_not_verified"` until verified |
| GET | `/auth/me` | Bearer | The signed-in user |
| GET | `/campaigns` | Bearer | Campaigns the signed-in creator is on, active first |

Errors are JSON: `{ "error": "message", "fields": { "email": "…" } }` (`fields` only for validation errors; some errors also carry a `code`).

Passwords are hashed with bcrypt (cost 12). Login returns a JWT (HS256, 7 days) that the site sends as `Authorization: Bearer <token>`. Auth routes are rate-limited to 30 requests per 15 minutes per IP, and CORS only allows the origins in `CORS_ORIGINS`.

## Email verification

Sign-up creates the account unverified and emails a link to `APP_URL/verify/?token=…`; no session is issued until the link is used, and login refuses unverified accounts. The verification page asks for the sign-up password as well: the link proves who owns the inbox and the password proves the link came from that person's own sign-up, so a link triggered by someone else's sign-up for the same address cannot activate a password its owner did not choose. A wrong password leaves the link usable. The link works once and expires after 24 hours; only a SHA-256 hash of its token is stored. Requesting a new link (at most one per minute) or signing up again invalidates earlier links.

An unverified account does not reserve its address: signing up again with the same email replaces its name and password. Sign-up and resend answer the same way whether or not the email already has an account (a verified address gets a "you already have an account" email instead), so they do not reveal which emails are registered.

Email is sent with [Resend](https://resend.com) using `RESEND_API_KEY` and the sender in `EMAIL_FROM` (an address on a domain verified in Resend). Without a key, which is only allowed outside production, the email is printed to the server console so the link can be copied from there.

## Data

`migrations/*.sql` are applied once each, in order, on start (or with `npm run migrate`).

- `users`: creator accounts (unique email, case-insensitive; `email_verified_at` is null until verified).
- `email_verifications`: hashed single-use verification tokens with their expiry.
- `campaigns`: brand, title, goal, platform, deliverables, creator fee, dates.
- `campaign_creators`: which creator is on which campaign, with status `invited`, `active` or `completed`.

`002_sample_campaigns.sql` adds five illustrative campaigns (`is_sample`). Each account is added to them when it is verified, so the dashboard has data until real campaign assignment exists; the site labels them "Sample".

## Run locally

Requires Node.js 22+ and PostgreSQL 13+.

```sh
docker run -d --name infloop-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=infloop -p 5432:5432 postgres:16-alpine
cd api
npm ci
DATABASE_URL=postgres://postgres:postgres@localhost:5432/infloop npm start   # http://localhost:4000
```

Then run the site from the repository root with `npm run dev`; `.env.development` points it at `http://localhost:4000`. After signing up, open the verification link that the API prints to its console.

`npm test` creates and drops a throwaway database on the server in `DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/postgres`).

## Configuration

See `.env.example`: `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET` (32+ characters; required in production, otherwise a temporary key is generated on each start), `CORS_ORIGINS`, `TRUST_PROXY`, `PORT`, and for email `RESEND_API_KEY` and `EMAIL_FROM` (both required in production) and `APP_URL` (the site's address, used in verification links).

## Deploy

Any Node host with a PostgreSQL database works. `render.yaml` in the repository root describes a Render web service and database. After deploying, put the API's public URL in `.env.production` in the repository root as `VITE_API_URL=…` so the GitHub Pages build points at it.
