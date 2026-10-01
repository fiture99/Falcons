# Club Gym Manager

A club operations app for staff to manage memberships, attendance, sessions, approvals, training logs, and payments from shared PostgreSQL-backed data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/club-gym-manager` — React web application
- `artifacts/api-server/src/routes/gym.ts` — gym API endpoints
- `lib/db/src/schema/` — Drizzle PostgreSQL tables
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — generated API hooks and validation

## Architecture decisions

- The frontend consumes generated React Query hooks; API request/response contracts are defined in OpenAPI first.
- Medical hold is stored as `hold`; the API also accepts the display label `medical hold`.
- The staff role selector changes visible screens only. It is not authentication or server-enforced authorization.
- Payments are recorded in GMD dalasi and extend the selected member's plan term without clearing medical holds.

## Product

Staff can review club activity, check members in, manage member records and registrations, schedule sessions and bookings, record training work, and track payment history. Public visitors can submit a registration request for staff approval.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- When changing API endpoints, update `lib/api-spec/openapi.yaml` and regenerate with `pnpm --filter @workspace/api-spec run codegen`.
- Run `pnpm --filter @workspace/db run push` after changing Drizzle schemas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
