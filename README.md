HomeMatch is a reverse rental marketplace for Bulgaria. Instead of scrolling through listings, people looking for a home post a request: city, property type, rental term, furnishing, pets, and whether they accept brokers. Owners and brokers browse these requests and send offers. The seeker compares the offers and decides whose contact to approve. Providers can be rated and reported.

It started as a university project for a Global Databases course (MongoDB) and is now an MVP that I’m preparing to deploy and run on AWS. The product idea and business logic are mine; most of the code was written with AI coding tools.

## Tech stack

- Frontend (repo root): React 18, TypeScript, Vite 5, Tailwind CSS 3, shadcn/ui (Radix UI), React Router 6, Leaflet / react-leaflet for maps.
- Backend (`server/`): Node.js, Express 5, MongoDB with Mongoose 9, JWT authentication (jsonwebtoken), bcryptjs for password hashing. The backend is a separate npm package with its own `package.json`.
- Vitest with Testing Library (jsdom) is configured for frontend tests.
- The UI and API messages are in Bulgarian.

## Run locally

### Prerequisites

- Node.js 20.19 or newer (required by Mongoose 9) and npm
- A MongoDB database, local or hosted (for example MongoDB Atlas)

### Install

```sh
npm install                 # frontend
cd server && npm install    # backend
```

### Environment variables

Copy `.env.example` to `.env` in the repo root:

- `VITE_API_URL`: base URL of the API, including the `/api` path. If it is not set, the frontend uses the local API on port 5000.

Copy `server/.env.example` to `server/.env`:

- `PORT`: port the API listens on. Defaults to 5000.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: secret used to sign and verify login tokens. Use a long random string.

Both `.env` files are ignored by git.

### Start

Run the API and the frontend in two terminals, both from the repo root:

```sh
npm run dev:api   # API on http://localhost:5000, routes under /api
npm run dev       # frontend on http://localhost:8080
```

The frontend port is set in `vite.config.ts`. If you change `PORT`, update `VITE_API_URL` to match and restart the frontend dev server.

Other scripts: `npm run build` (production build to `dist/`), `npm run lint`, `npm test`.

## Known limitations

- The JWT is stored in `localStorage`. This is an accepted risk for the MVP: any XSS on the site could read the token. Tokens are valid for 7 days.
- SMS phone verification is disabled (`SMS_VERIFICATION_ENABLED = false` in `src/pages/Profile.tsx`). Phone numbers are saved without being verified.
- Password reset is not implemented. The "forgot password" screen only shows a message that the feature is coming soon.
- Roles are self-declared. Users choose seeker, broker or owner themselves, and nothing checks that a broker or owner really is one. The "owners only" and "brokers only" request settings depend on this role.
- The only rate limit is 5 offers per provider per day, counted from midnight in the server's time zone. Login, registration and all other endpoints have no rate limiting.
- If `JWT_SECRET` is not set, the server signs tokens with a hardcoded fallback secret instead of refusing to start.
- Photos are sent as Base64 inside JSON and stored in MongoDB documents, so the API accepts request bodies up to 50 MB. Large requests can exhaust server memory.
- CORS allows requests from any origin (`cors()` is used with no options).
- Reports and feedback are saved to MongoDB, but there is no admin interface or API to read them. Users have a `blocked` flag that stops them from sending offers, but it can only be set directly in the database.
- Tests: there is one placeholder frontend test (`src/test/example.test.ts`). The backend has no tests.
