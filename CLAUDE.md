# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HomeMatch Bulgaria is a reverse rental marketplace: **seekers** post rental requests (city, budget, specs, neighborhoods), and **providers** (brokers or owners) answer them with offers. The UI text, comments, and API error messages are in **Bulgarian**; keep new user-facing strings in Bulgarian.

The repo has two separate apps:
- **Frontend** (repo root): Vite + React 18 + TypeScript + shadcn/ui + Tailwind.
- **Backend** (`server/`): Express 5 + Mongoose (MongoDB) + JWT, CommonJS, with its own `package.json` and `node_modules`.

## Commands

Run from the repo root unless noted:

```sh
npm install                 # frontend deps
(cd server && npm install)  # backend deps (separate package)

npm run dev                 # Vite dev server on http://localhost:8080
npm run dev:api             # Express API (node server/server.js), default port 5000
npm run build               # production build -> dist/
npm run lint                # eslint .
npm test                    # vitest run (jsdom, globals, setup in src/test/setup.ts)
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "test name"         # single test by name
```

Tests live at `src/**/*.{test,spec}.{ts,tsx}`. Only a placeholder test exists now, and the backend has no tests.

## Environment

- Root `.env`: `VITE_API_URL` (defaults to `http://localhost:5000/api`).
- `server/.env` (loaded explicitly via `path.join(__dirname, '.env')`): `PORT`, `MONGO_URI`, `JWT_SECRET`. Both directories have a `.env.example`.
- `.claude/settings.json` blocks reading and editing `.env` files. Use the `.env.example` files instead.

## Architecture

### Backend (`server/server.js`)
All routes sit in one file under `/api/*`, grouped by section comments (auth/profile, requests, offers, saved properties, notifications, reviews, reports, feedback, stats). Models are in `server/models/`.
- `authenticate` middleware checks `Authorization: Bearer <jwt>` and sets `req.user.id`. Almost every route uses it. Authorization is checked by hand in each handler with `isSameId(a, b)` (string comparison of ObjectIds). New routes should follow the same ownership checks.
- Business rules are enforced on the server in `POST /api/offers`: the responder must not be blocked, cannot answer their own request, and the request must be active and not expired. The `allow_brokers` setting is enforced (`owners_only` → owners only, `yes` → brokers only, `both`). Each provider can send **at most 5 offers per day** (429).
- **Privacy circle**: `GET /api/offers/seeker-view/:id` shifts offer coordinates by a deterministic offset seeded from the offer id, so refreshing can't be used to average out the true location. It also hides the responder's phone until `contact_status === 'approved'`. The broker's own view is `GET /api/offers/:id`, which shows unmasked data.
- Changing an offer's status (seeker approves/rejects) and creating an offer both write `Notification` documents. Notifications are polled by the frontend; there are no websockets.
- Photos are stored inline as Base64 strings in Mongo, which is why the JSON body limit is 50mb.
- `Offer.location` is GeoJSON `[lng, lat]` with a `2dsphere` index. The indexes on the models are deliberate (comments say they are coursework requirements), so don't remove them.
- `normalizeRequestPayload` accepts both nested (`budget`, `specs`) and flat (`budget_min`, `bedrooms`, …) request shapes.

### Frontend (`src/`)
- Routing is in `src/App.tsx`. Index/Auth/Dashboard load eagerly and the other pages are `lazy()`. Add new routes above the catch-all `*` route.
- Data fetching uses plain `fetch` against `API_URL` with `authHeaders()` from `src/lib/api.ts`, directly inside page components. React Query is installed and its provider is mounted, but it isn't used for fetching.
- Auth (`src/contexts/AuthContext.tsx`) keeps the JWT and user object in `localStorage` (`token`, `user`). It maps Mongo `_id` to `id` for `user` and `profile`. On reload it restores from localStorage without calling the server.
- **Roles vs. mode**: `profile.role` is `seeker | broker | owner`. Separately, `activeMode` (`seeker | provider`, saved in localStorage) controls which UI a user sees. A seeker can become a provider through `addProviderRole`. Seeker-side pages: NewRequest, MyRequests, MyReceivedOffers, SeekerOfferDetail. Provider-side pages: BrowseRequests, SubmitResponse, MyResponses, MyProperties/SavedPropertyForm (the provider's portfolio of reusable properties), BrokerOfferDetail.
- `src/components/ui/` holds generated shadcn components (config in `components.json`); prefer composing them over editing them. The path alias is `@/` → `src/`.
- `src/data/neighborhoods.ts` holds the static city → neighborhood data. Maps use Leaflet / react-leaflet.

## Rules and known issues
- **Request body limit (50mb):** a large limit lets anyone exhaust server memory (DoS). It exists because photos are sent as Base64 in JSON. Do not raise it or add new Base64 payloads; the fix (small JSON limit, separate size-limited photo upload) is planned.
- **JWT in localStorage (accepted risk):** any XSS on the site could read the token and take over the account. Moving to httpOnly cookies is planned later, not now. Until then: never render user content as raw HTML (no `dangerouslySetInnerHTML`, no building HTML strings), and do not store anything else sensitive in localStorage.
- **Secrets:** never read, print, log or commit `.env` files. Secrets come only from environment variables. New settings go into `.env.example` with placeholder values.
