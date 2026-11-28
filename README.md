# infloop

A fresh identity and responsive, four-page marketing site for infloop: one connected loop for influencer discovery, campaign management, tracking, and analytics.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The development URL is printed by Vite. Production assets use the `/infloop/` base path.

```sh
npm test
npm run build
npm run preview
```

## Pages

- **Home:** custom loop mark and wordmark, interactive Three.js race circuit with camera rotation, four campaign stages, a live lap counter, playback control, animated stats, and accessible accordions.
- **Creators:** searchable, sortable niche-filtered sample roster, accessible profile dialogs, and a persistent device-local shortlist.
- **Pricing:** Pilot ($1K–$10K), Growth ($10K–$75K), and Flagship ($75K–$300K+) plans, with an interactive campaign planner that prefills the brief builder.
- **Start a campaign:** three-step, validated brief builder with local draft storage, creator shortlist, a review step, and JSON download.

Clean-path browser routing uses the `/infloop/` base. The production build emits real `creators/index.html`, `pricing/index.html`, and `start/index.html` entries, so direct visits and refreshes return the app on GitHub Pages. Pages redirects directory paths to their trailing-slash URL. A `404.html` app entry handles unknown paths with the site's missing-page view. Previously shared `#/…` links are upgraded to their clean-path equivalent on load.

## Deployment

The public site is deployed to **https://anuragtyagi-si.github.io/infloop/** using `.github/workflows/pages.yml`. Pull requests run planner tests and the production build (and the API tests when `api/` changes); pushes to `main` also publish to GitHub Pages. Set the repository's Pages source to **GitHub Actions**.

## Creator accounts and API

`api/` is a separate Node.js + PostgreSQL service with creator sign-up, login, and a campaigns endpoint; see [api/README.md](api/README.md). The site adds three pages that call it: **Creator login** (`/login`, log in or sign up), **Verify** (`/verify`, where the emailed verification link lands; new accounts must verify their email before they can log in) and **Dashboard** (`/dashboard`, the signed-in creator's campaigns). The API URL is read at build time from `VITE_API_URL` (`.env.development` for local work, `.env.production` for the published site). Without it, these pages say the API is not connected and the rest of the site is unaffected.

## Product boundaries

Apart from creator accounts, this is a static marketing and campaign-planning experience, not a live talent marketplace. Dashboard campaigns are illustrative samples. Creator identities, handles, follower counts, and engagement metrics are explicitly illustrative. No profile implies representation or availability. No creator booking, payment, email, or brief submission occurs. Briefs and shortlists stay in browser local storage, and the user can download their own brief.

The planner is directional, not a forecast: it allocates 65% of a capped planning budget to illustrative creator fees ($1,400 for awareness/engagement or $1,900 for conversion scenarios). Content count is three pieces per creator, or four for scenarios of at least eight weeks. Impressions use illustrative budget multipliers of 95, 70, and 45 for awareness, engagement, and conversions. Estimates are not guaranteed or quoted.

The Three.js scene honors reduced-motion preferences, pauses when offscreen, caps rendering pixel ratio, and includes a fallback when WebGL is unavailable. The site has keyboard navigation, modal focus handling, a skip link, responsive layouts, and no analytics or tracking scripts.

## Design and imagery

The loop identity and circuit are original vector/procedural artwork. UI icons are from [Lucide](https://lucide.dev/) (ISC license). Fonts: DM Sans, Space Grotesk, and Instrument Serif via Google Fonts (open font licenses).

Stock portraits are from [Unsplash](https://unsplash.com/license), downloaded into `public/images` for reliable delivery:

| File | Unsplash photo |
| --- | --- |
| maya.jpg | [1524504388940-b1c1722653e1](https://unsplash.com/photos/1524504388940-b1c1722653e1) |
| jordan.jpg | [1534528741775-53994a69daeb](https://unsplash.com/photos/1534528741775-53994a69daeb) |
| sofia.jpg | [1531123897727-8f129e1688ce](https://unsplash.com/photos/1531123897727-8f129e1688ce) |
| alex.jpg | [1500648767791-00dcc994a43e](https://unsplash.com/photos/1500648767791-00dcc994a43e) |
| amara.jpg | [1534751516642-a1af1ef26a56](https://unsplash.com/photos/1534751516642-a1af1ef26a56) |
| leo.jpg | [1506794778202-cad84cf45f1d](https://unsplash.com/photos/1506794778202-cad84cf45f1d) |
