# CollegeDiscover

A full-stack college discovery platform: search a catalogue of colleges, read
detailed profiles, compare institutions side by side, and save a personal
shortlist behind authentication.

Built for the AI Software Engineer internship assignment (**Full Stack Track A**),
scoped deliberately to four features executed properly rather than a wider set
executed thinly.

> **Note on the data.** The college *names* are real institutions, but every
> figure — fees, packages, ratings, placement rates, reviews — is **invented
> sample data** for demonstration. Nothing here is verified and none of it
> should inform a real admission decision.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Running the app](#running-the-app)
- [Testing](#testing)
- [API reference](#api-reference)
- [Security](#security)
- [Performance](#performance)
- [Engineering decisions](#engineering-decisions)
- [Known limitations](#known-limitations)
- [Deployment](#deployment)

---

## Features

### 1. College listing + search
- Full-text-ish search across name, city, state and description
- Filter by state, type (Public / Private / Deemed), fee bracket and minimum rating
- Sort by rating, average package, fees, name or year established
- Server-side pagination
- Loading skeletons, empty state, error state with retry
- Save and add-to-compare directly from a card

**Search, filtering, sorting and pagination all execute in PostgreSQL.** The
browser never receives a row it is going to discard, so the dataset can grow
without the client changing.

### 2. College detail page
`/colleges/[id]` — accepts either the cuid or the SEO slug (`/colleges/iit-bombay`).

Four tabs backed by real relational data:
- **Overview** — description, quick facts, rating distribution, placement snapshot
- **Courses** — name, degree, duration, fees, seats
- **Placements** — year-by-year average/highest package, placement rate, top recruiter
- **Reviews** — rating, title, body, author, date

Server-rendered, with a real `404` status for a college that does not exist.

### 3. Compare colleges
- Compare **2–3** colleges side by side
- Selection persists across navigation and page reloads
- Duplicate selection is impossible (client *and* server)
- Remove one, or clear all
- Every column that ties for "best" in a row is highlighted, not just the first
- Shareable URL: `/compare?ids=a,b,c`
- Graceful handling of too few, too many, and non-existent ids

### 4. Authentication + saved colleges
- Sign up, sign in, sign out, current-user probe
- Encrypted, HTTP-only session cookie
- Save / unsave a college; view your shortlist at `/saved`
- **Authorization enforced server-side** — a user can only ever read or modify
  their own saved colleges
- Duplicate saves prevented by a database unique constraint

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | One deployable unit for UI + API; Server Components remove a network hop for page data |
| Language | **TypeScript** (strict) | Types shared end-to-end, from Prisma model to React prop |
| Styling | **Tailwind CSS 4** | Utility-first, with a small set of component classes in `globals.css` for repeated patterns |
| Database | **PostgreSQL 16** | Relational data with real constraints; `DECIMAL` for money |
| ORM | **Prisma 6** | Type-safe queries and parameterised SQL by construction |
| Validation | **Zod** | One definition yields both the runtime check and the TypeScript type |
| Auth | **iron-session 8** | Stateless encrypted cookie — no session store to run |
| Hashing | **bcryptjs** | Deliberately slow, per-password salt |
| Tests | **Jest + ts-jest** | Unit suite plus DB-backed integration suite |

No state-management library, no UI component library, no API client library.
Each was considered and rejected as unnecessary at this scope — see
[Engineering decisions](#engineering-decisions).

---

## Architecture

A **clean modular monolith**. One codebase, one deployment, clear internal seams.

```
Browser
   │
   ├── Server Components ──────────────┐
   │   (home, detail, saved, auth)     │  call the service layer directly —
   │                                   │  same process, so no HTTP hop
   │                                   ▼
   └── Client Components ──► Route Handlers ──► Validation ──► Services ──► Prisma ──► PostgreSQL
       (search, compare,       app/api/**        Zod            lib/services/
        save toggles)
```

### Directory layout

```
app/
├── api/                      Route Handlers — parse, validate, delegate, respond
│   ├── auth/{signup,login,logout,me}/
│   ├── colleges/{,[id],filter-options}/
│   ├── compare/
│   ├── health/
│   └── saved-colleges/{,[collegeId]}/
├── colleges/[id]/            Detail page + not-found + error boundary
├── compare/  saved/  login/  signup/
├── layout.tsx  page.tsx  error.tsx  not-found.tsx

lib/
├── api/          responses.ts · errors.ts · request.ts   HTTP boundary
├── auth/         session.ts · password.ts · rate-limit.ts
├── client/       api.ts (typed fetch) · compare-store.ts
├── config/       env.ts        validates environment at boot
├── db/           prisma.ts     client singleton + health probe
├── services/     college · auth · saved      ← all business logic
├── validation/   schemas.ts    every Zod schema
└── format.ts     display formatters

components/
├── providers/    AppProviders · AuthProvider · CompareProvider · ToastProvider
├── colleges/     CollegeCard · CollegeListClient · CollegeFilters · CollegeDetailClient · CollegeSkeleton
├── compare/      CompareClient · CompareTable · CompareTray · CollegePicker
├── saved/        SavedCollegesClient
├── auth/         AuthCard · LoginForm · SignupForm
└── ui/           Navbar · Pagination · RatingStars · EmptyState

prisma/           schema.prisma · migrations/ · seed.ts
tests/            unit/ (no DB) · integration/ (real PostgreSQL)
```

### The layering rule

A route handler only ever does four things: read the request, validate it, call
a service, shape the response. It contains no query building and no business
rules. That keeps the logic testable without an HTTP server, and lets Server
Components reuse the exact same code path.

### Database schema

```
User ─┬─< SavedCollege >─┬─ College ─┬─< Course
      │                  │           ├─< Placement
      └─< Review >───────┴───────────┘
```

| Model | Notes |
|---|---|
| `User` | unique `email`; stores `passwordHash` only |
| `College` | indexed on `name`, `location`, `rating`, `fees`, `type`, `state`; unique `slug` |
| `Course` | FK → College, cascade delete |
| `Placement` | FK → College, cascade delete; indexed on `year` |
| `Review` | FK → College (cascade) and User (`SetNull`, so deleting a user preserves their review anonymously) |
| `SavedCollege` | **`@@unique([userId, collegeId])`** — the database, not the app, guarantees no duplicate saves |

Money and ratings use `DECIMAL`, never float, and are serialised to strings
across the API so precision survives JSON.

---

## Getting started

### Prerequisites

- **Node.js 20.9+** (Next.js 16 minimum)
- **Docker** (for local PostgreSQL)
- npm

### Setup — five commands

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Create your env file
cp .env.example .env
#    The defaults in .env.example match docker-compose.yml and work as-is
#    for local development. Generate a real SESSION_SECRET:
#        openssl rand -base64 32

# 3. Start PostgreSQL
npm run db:up

# 4. Create the schema
npm run db:migrate

# 5. Load the demo dataset
npm run db:seed
```

Then:

```bash
npm run dev
```

Open <http://localhost:3000>.

**Demo account:** `demo@example.com` / `Demo@123`

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Must begin `postgresql://` or `postgres://` |
| `SESSION_SECRET` | yes | Key used to encrypt the session cookie. **Minimum 32 characters.** Generate with `openssl rand -base64 32` |
| `NODE_ENV` | no | `development` \| `test` \| `production`. Defaults to `development` |

All three are validated at startup in [`lib/config/env.ts`](lib/config/env.ts).
A missing or malformed value fails the boot with an explicit message instead of
surfacing as a confusing 500 mid-request.

`NODE_ENV` also controls the `Secure` flag on the session cookie. Keep it as
`development` locally — setting it to `production` marks the cookie `Secure`,
and the browser will then refuse to send it over plain `http://localhost`, so
sign-in would silently never persist.

---

## Database

### Docker PostgreSQL

`docker-compose.yml` runs `postgres:16-alpine` on **port 5433** (not 5432, so it
does not clash with an existing local Postgres) with a healthcheck and a named
volume for persistence.

```bash
npm run db:up      # start
npm run db:down    # stop
```

### Commands

| Command | What it does |
|---|---|
| `npm run db:migrate` | Create + apply a migration (development) |
| `npm run db:deploy` | Apply existing migrations without generating new ones (**production**) |
| `npm run db:seed` | Load the demo dataset |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | ⚠️ Drop everything, re-migrate, re-seed |

### Migrations

Migrations live in `prisma/migrations/` and are committed. The initial migration
was preserved rather than regenerated, so existing databases keep their history.

Use `db:migrate` in development (it generates new migration files) and
`db:deploy` in production (it only applies what already exists — it never
generates or resets).

### Seed data

`prisma/seed.ts` loads **28 colleges, 88 courses, 56 placement records, 57
reviews and 8 users** — enough to exercise pagination (3 pages at the default
12 per page), every filter, and every sort.

The seed is **deterministic**: no randomness, so dev, CI and a reviewer's
machine produce identical data and identical query results.

It is also **destructive** — it truncates every table before inserting. It is a
development tool; never run it against production.

---

## Running the app

```bash
npm run dev          # development server
npm run build        # production build (runs prisma generate first)
npm start            # serve the production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # all tests
```

---

## Testing

Two suites with different requirements:

```bash
npm run test:unit         # pure logic — no database needed
npm run test:integration  # real PostgreSQL — needs `npm run db:up` first
npm test                  # both
```

**164 tests across 9 suites.**

### Unit (`tests/unit/`) — no database
- `validation.test.ts` — every Zod schema: defaults, coercion, boundaries, rejection of unsafe input
- `format.test.ts` — currency/rating/percent/date formatters and their fallbacks
- `pagination.test.ts` — pagination maths and the page-number window
- `password.test.ts` — hashing, salting, cost factor, and that the timing-protection dummy hash actually costs time
- `rate-limit.test.ts` — window behaviour, per-key isolation, expiry
- `compare-highlight.test.ts` — "best value" logic including ties, nulls and zero

### Integration (`tests/integration/`) — real PostgreSQL
Mocking Prisma here would only test the mock. Unique constraints, foreign keys,
case-insensitive matching and `DECIMAL` handling exist *only* in the database,
and those are exactly the behaviours worth verifying.

- `college.service.test.ts` — search, filters, sorting, pagination stability, detail, compare
- `auth.service.test.ts` — hashing, duplicate emails, case-insensitive email identity, identical failure messages
- `saved.service.test.ts` — **authorization**: one user cannot read or delete another's saved colleges; cascade behaviour

Each test creates data under a `zz-test-` prefix and cleans up afterwards, so
the suite is safe to run against a seeded development database and is repeatable
without a reset.

### Manual verification

The following were exercised end-to-end against the production build (via HTTP
and a real browser) — see [the report of what was tested](#known-limitations):
browse, search, filter, sort, paginate, detail, compare 2 and 3, duplicate
prevention, register, login, logout, save, unsave, shortlist, unauthenticated
access, cross-user access, invalid ids, empty results.

---

## API reference

All responses use exactly two shapes:

```jsonc
// success
{ "data": { ... } }

// error
{ "error": "human-readable message", "code": "MACHINE_CODE", "details": { "field": ["..."] } }
```

| Method | Endpoint | Auth | Description |
|---|---|:--:|---|
| `GET` | `/api/health` | — | App + database liveness. `503` if the DB is unreachable |
| `GET` | `/api/colleges` | — | Search / filter / sort / paginate |
| `GET` | `/api/colleges/[id]` | optional | Full detail by id **or** slug; includes `isSaved` when signed in |
| `GET` | `/api/colleges/filter-options` | — | Distinct states and types for the filter dropdowns |
| `GET` | `/api/compare?ids=a,b[,c]` | — | Comparison data for 2–3 colleges |
| `POST` | `/api/auth/signup` | — | Create account + start session |
| `POST` | `/api/auth/login` | — | Start session |
| `POST` | `/api/auth/logout` | — | Destroy session |
| `GET` | `/api/auth/me` | ✓ | Current user, or `401` |
| `GET` | `/api/saved-colleges` | ✓ | The signed-in user's shortlist |
| `POST` | `/api/saved-colleges` | ✓ | Save a college. Body: `{ collegeId }` |
| `DELETE` | `/api/saved-colleges/[collegeId]` | ✓ | Unsave a college |

### `GET /api/colleges` parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Matches name, city, state, description (case-insensitive) |
| `state` | string | — | Exact match |
| `type` | enum | — | `Public` \| `Private` \| `Deemed` |
| `minFees` / `maxFees` | number | — | Rejected if min > max |
| `minRating` / `maxRating` | number | — | 0–5; rejected if min > max |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `12` | 1–48 |
| `sortBy` | enum | `rating` | Allow-listed columns only |
| `sortOrder` | enum | `desc` | `asc` \| `desc` |

### Status codes

`200` OK · `201` Created · `307` redirect (protected page while signed out) ·
`400` validation · `401` unauthenticated · `404` not found · `405` wrong method ·
`409` conflict (duplicate email / duplicate save) · `429` rate limited (with
`Retry-After`) · `500` unexpected · `503` database unreachable

---

## Security

| Concern | How it is handled |
|---|---|
| Password storage | bcrypt, cost factor 12, per-password salt. Plaintext is never stored or logged |
| Session | `iron-session` — AEAD-encrypted and signed cookie. `httpOnly`, `sameSite=lax`, `secure` in production, 7-day expiry |
| Secrets | Only ever read through `lib/config/env.ts`. `process.env` appears in exactly one file. `.env` is gitignored; `.env.example` is the committed template |
| Authorization | Enforced **server-side, in the service layer**. Every saved-college query is scoped by the session `userId`, so "read/delete someone else's data" is not expressible through the API |
| SQL injection | Prisma parameterises everything. `sortBy` is a Zod enum allow-list, so no user string ever reaches `ORDER BY`. The one `$queryRaw` is a literal `SELECT 1` with no interpolation |
| Input validation | Every query param and request body passes a Zod schema before reaching a service. Client-side validation is convenience only |
| Data exposure | Services select explicit field lists. `passwordHash` is never in a return projection; review authors expose `id` and `name` only |
| User enumeration | Wrong password and unknown email return an identical message, status *and* response time — the timing comes from comparing against a real bcrypt hash when no user exists |
| Brute force | Fixed-window rate limit on `/api/auth/login` (10 / 15 min) and `/api/auth/signup` (10 / hour), keyed by client IP so an attacker cannot lock a specific victim out |
| CSRF | `sameSite=lax` blocks cross-site state-changing requests; logout is `POST`-only so it cannot be triggered by an `<img>` tag |
| Error leakage | `handleApiError` maps known failures to safe messages and replaces everything else with a generic 500. Prisma errors are logged server-side, never returned |
| Open redirect | `?next=` is accepted only when it is a relative path (`/…` but not `//…`) |

---

## Performance

- **Indexes** on every column used for filtering and sorting (`name`, `location`, `rating`, `fees`, `type`, `state`) plus all foreign keys
- **Pagination pushed to the database** (`LIMIT`/`OFFSET`) — the full catalogue is never loaded into the browser
- **Explicit `select` projections** — list queries fetch only the 15 fields a card renders, not the description or relations
- **`count` and page query run in parallel** via `Promise.all`
- **No N+1** — relations come from a single `include`; compare fetches all colleges in one `IN (...)` query
- **Detail lookup is one query**, matching id `OR` slug (previously two round-trips for every slug URL)
- **Stable sort** — a secondary sort on `id` prevents rows repeating or vanishing across pages when the primary key ties
- **Search debounced 350 ms** and previous requests aborted — typing "Bangalore" issues one request, not nine
- **Filter options fetched once** per session, not per search
- **Homepage cached** for an hour (`revalidate = 3600`)
- **Server Components call services directly**, skipping an internal HTTP round-trip

No Redis, Elasticsearch or message queue. At this data volume they would be
complexity without benefit.

---

## Engineering decisions

**Modular monolith over microservices.** Four cohesive features sharing one
data model. Service boundaries here would add network calls and deployment
complexity for no isolation benefit.

**Service layer between routes and Prisma.** Route handlers stay four lines
long, business logic is unit-testable without HTTP, and Server Components reuse
the same functions. This is the single most important structural choice.

**Typed `AppError` instead of string matching.** The original code detected
failures with `error.message.startsWith("Colleges not found:")` — which breaks
silently the moment a message is reworded. Services now throw a typed error
carrying its HTTP status, and one function maps it to a response.

**React Context, not Redux/Zustand, for compare state.** The state is one array
of at most three ids with four operations. A library would be pure overhead.

**`useSyncExternalStore` for the compare selection.** The selection genuinely
lives outside React (localStorage, shared across tabs). Hydrating it with
`useEffect(() => setState(read()))` causes a second render pass on every mount —
which React 19 now flags. `useSyncExternalStore` is the API built for this, and
subscribing to the `storage` event syncs two open tabs for free.

**Server-side guard on `/saved`.** The page is a Server Component that redirects
before emitting any HTML. The API route enforces the same rule independently —
defence in depth, not a substitute.

**Rate limiting *after* validation.** Counting malformed requests against the
budget means a user who mistypes their password is locked out, while an attacker
sending well-formed requests is throttled either way. Malformed requests are
cheap, so leaving them uncounted costs nothing.

**No `loading.tsx` on the college detail route.** It would create a Suspense
boundary, which makes Next.js begin streaming — committing HTTP `200` before the
lookup runs. `notFound()` would still render the right UI, but the response
would carry `200`: a soft 404 that search engines index and uptime monitoring
cannot detect. The lookup is one indexed query, so the skeleton would show for
milliseconds. An honest status code is worth more. *(Verified empirically: with
`loading.tsx` present the response is `200`; without it, `404`.)*

**Decimal-as-string across the API.** `DECIMAL` cannot round-trip through a
JavaScript number without precision loss. Values are serialised as strings and
parsed only at the display boundary.

**Unique constraint, not a pre-flight check, for duplicates.** A
check-then-insert has a race window where two concurrent requests both pass.
Signup relies on the unique index on `email` and saves on
`@@unique([userId, collegeId])`, catching `P2002`. The database is the only
place that can decide this atomically.

**Integration tests hit a real database.** Constraints, cascades,
case-insensitivity and `DECIMAL` behaviour exist only in PostgreSQL. A mocked
Prisma client would assert that the mock works.

---

## Known limitations

Stated plainly, with the reasoning:

1. **Search uses `ILIKE '%term%'`**, which cannot use a B-tree index — it is a
   sequential scan. At 28 rows this is irrelevant. The production path is a
   `pg_trgm` GIN index or PostgreSQL full-text search with a `tsvector` column.
   Documented rather than implemented because it would be optimising a
   non-problem at this data volume.

2. **Rate limiting is in-process.** On a multi-instance or serverless
   deployment each instance keeps its own counter, so the effective limit is
   per-instance. Real scale needs Redis or an edge rate limiter. Adding that
   infrastructure here would be premature.

3. **Sessions cannot be revoked server-side.** A stateless encrypted cookie is
   valid until it expires (7 days). Rotating `SESSION_SECRET` invalidates all
   sessions at once. Per-session revocation would need a session table — the
   deliberate trade-off for not running a session store.

4. **Reviews are read-only.** The schema and API support authored reviews
   (`Review.userId`), but no write endpoint or form exists. Writing reviews was
   not one of the four selected features.

5. **Review data on the detail page is capped at 10** (most recent) with no
   "load more". The count shown is the true total.

6. **The rating distribution bar chart is computed from those 10 reviews**, not
   all of them — and is labelled as such rather than implying a full histogram.

7. **`/api/auth/me` returns `401` for anonymous visitors**, which browsers log
   as a console error on every page load. This is correct REST semantics for an
   auth probe; the noise is cosmetic.

8. **No end-to-end test suite in CI.** Flows were verified manually against the
   production build via HTTP and a real browser. Playwright specs would be the
   next addition.

9. **Sample data only.** See the note at the top of this file.

---

## Deployment

Target: **Vercel + Neon** (or any managed PostgreSQL).

Nothing here has been deployed — these are the steps to do so.

### 1. Database

Create a Neon project and take the **pooled** connection string
(`...-pooler...`), keeping `sslmode=require`. Serverless functions open many
short-lived connections, and the pooler is what stops them exhausting Postgres'
connection limit.

### 2. Vercel environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled Neon string |
| `SESSION_SECRET` | a **new** 32+ character secret — `openssl rand -base64 32`. Never reuse the local one |

Do **not** set `NODE_ENV`; Vercel sets it to `production` itself.

### 3. Build

`npm run build` runs `prisma generate && next build`. `prisma generate` also
runs on `postinstall`, so the client is present regardless of build cache state.

`DATABASE_URL` must be available at build time: the homepage is statically
prerendered (`revalidate = 3600`) and queries the database during the build.

### 4. Migrations

```bash
npx prisma migrate deploy   # or: npm run db:deploy
```

Run this against production **before or during** deploy. Use `migrate deploy`,
never `migrate dev` or `db push` — only `deploy` applies committed migrations
without generating or resetting anything.

Seeding production is optional and destructive; if you want the demo catalogue
there, run it once against a fresh database and never again.

### 5. Verify

```bash
curl https://<your-app>.vercel.app/api/health
# {"status":"ok","database":"up","latencyMs":12,"timestamp":"..."}
```

A `503` means the app is running but cannot reach PostgreSQL — check
`DATABASE_URL` and that migrations were applied.

### Deployment checklist

- [x] `npm run build` succeeds
- [x] `npm run lint` clean
- [x] `npm run typecheck` clean
- [x] `npm test` passes (164 tests)
- [x] `.env` gitignored, `.env.example` committed
- [x] No secrets in source — `process.env` read in exactly one file
- [x] `prisma generate` wired into build and postinstall
- [x] `/api/health` reports database connectivity
- [x] Production config separated from local config
