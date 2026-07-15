# LTraffic Unified API

Node.js REST API serving **both** LTraffic mobile apps (Admin + Employee) from a single codebase, backed by the shared `lt_employee` MySQL database. The PHP web application keeps its own session-based auth and remains the source of truth for business logic during the migration.

> **Status:** P0 (Foundation) — no business modules yet. See `docs/audit/06-architecture.md` for the full plan.

## Prerequisites

- Node.js ≥ 18.17
- MySQL 5.7 / 8.0 with the `lt_employee` schema loaded (`mysql/lt_employee.sql`)

## Getting started

```bash
cp .env.example .env
# edit .env — set DB creds and JWT_SECRET at minimum

npm install
npm run dev
```

The server boots on `PORT` (default 3000). Health check: `GET http://localhost:3000/api/v1/health`.

## Project layout

```
src/
  app.js               # express wiring
  server.js            # http listen + graceful shutdown
  config/              # env, db pool, logger, swagger, firebase, constants
  common/              # ApiError, response envelope, pagination, request-id, tx helper
  constants/           # roles, status enums, table names, error codes
  utils/               # date/hash/php-serialize/boolean helpers
  middlewares/         # auth, rbac, validate, upload, rate-limit, error, audit, request-log
  modules/             # domain modules (controller / service / repository / routes / validator / dto)
  routes/index.js      # single mount table
scripts/schema/        # SQL for new tables added in phase 1 (legacy tables untouched)
docs/audit/            # pre-implementation audit deliverables (approved)
tests/                 # unit + integration (jest + supertest)
```

## File uploads — shared with PHP web

Mobile uploads land in the **same folder tree** the PHP web app uses, so a file uploaded from the mobile app is immediately visible to the web app and vice versa.

- `UPLOADS_ROOT` env var — absolute path to the PHP `employeesarea` document root (in production, this is the Apache/IIS docroot). Node writes into subfolders that mirror the PHP folder names exactly (`admin/hsupload`, `admin/employeephoto`, `admin/erfiles`, `bulletin`, …).
- **Production:** Apache/IIS serves the files. Node has no static-file role.
- **Development:** if `NODE_ENV !== 'production'`, Node mounts the same folder at `/` as a convenience so DB-stored relative paths resolve without needing Apache locally. Dev fallback root is `./dev-files/`.
- The `ltraffic-api` project **never** contains an `uploads/` folder — that would break parity with PHP web.

1. **Shared DB, non-breaking.** Legacy tables are never modified in phase 1. New supporting tables only.
2. **Clean layering.** Controllers stay thin; services own business logic; repositories own SQL. No ORM.
3. **One API, two audiences.** Single `POST /auth/login` returns `{ token, userType }`. Middleware branches on `userType`.
4. **Fail loud in dev, fail safe in prod.** `ApiError` + central error middleware + structured Winston logs.
5. **Mobile-first contract.** JSON envelope, pagination on lists, FCM push for async flows.

## Documentation

- `docs/audit/00-index.md` — audit index
- `docs/audit/06-architecture.md` — approved architecture
- Swagger UI (when the server is running): `GET /api/v1/docs`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | nodemon + reload |
| `npm start` | production start |
| `npm run lint` / `lint:fix` | eslint |
| `npm run format` | prettier |
| `npm test` | jest |
| `npm run schema:apply` | apply new-table SQL from `scripts/schema/` |
