# OPUS Steel — Production Management Platform

Internal production management platform for OPUS Steel Construction LLC (Dubai).
Replaces Excel / WhatsApp / paper tracking for the full flow:

```
Project → Work Order → Drawings → Plant sees released WO → Material Issue
→ Production → Steel Consumption → Scrap → QC → Rework → Dispatch → Complete
```

This is the **Phase 1–3 MVP scaffold**: the schema covers all 5 phases from the
spec (so nothing needs a breaking migration later), and the working code covers
Phase 1 (projects, work orders, drawings, materials) and Phase 2/3 core flows
(production entries, the release gate, QC and dispatch seed data). Reports,
notifications UI, audit log UI, Excel import/export, and the Zoho Books
integration are stubbed in the schema but not yet built — see **Roadmap** below.

## 1. Architecture

- **Modular monolith**, not microservices — one Next.js app, one Postgres database.
- **Frontend + API**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS.
  Office and Plant get separate route groups — `(office)` and `(plant)` — with
  different navigation and information density (rule #43), sharing the same
  auth, permissions, and data layer.
- **Database**: PostgreSQL via Prisma ORM. Every important business fact
  (material stock, production progress, steel utilization) is **derived from
  an immutable transaction ledger**, never stored as a mutable running total.
  This is what rule #34 ("never delete material transactions, only reverse")
  and rule #39 (planned vs. actual must never overwrite each other) require.
- **Auth**: NextAuth (credentials provider), JWT sessions, `bcrypt` password
  hashing, role stored in the JWT and checked server-side on every mutation
  (`src/lib/permissions.ts`) — the frontend hiding a button is never the
  security boundary.
- **File storage**: designed for S3-compatible object storage. The schema
  stores only `fileKey` / `fileName` metadata; wire up actual uploads (e.g.
  `@aws-sdk/client-s3` against Cloudflare R2 or AWS S3) before going live —
  this MVP does not include a working upload endpoint yet.
- **Numbering**: atomic per-prefix-per-year counters (`NumberSequence` table)
  generate `PRJ-2026-00001`, `WO-2026-00001`, etc., independent of the
  internal UUID primary keys.
- **Zoho Books**: deliberately **not** integrated yet. `Customer`, `Project`,
  and `WorkOrder` are modelled so a future sync job can map
  Zoho Sales Order → Project/WorkOrder cleanly, and a Dispatch-completed
  webhook can later trigger a Zoho invoice. See rule #31 / Phase 5.

## 2. Folder structure

```
opus-steel/
├── docker-compose.yml       # Postgres + app, for local/VPS deployment
├── Dockerfile
├── prisma/
│   ├── schema.prisma        # Full data model (all phases)
│   └── seed.ts              # Demo data: Sobha Steel Fabrication scenario
└── src/
    ├── middleware.ts         # Requires a session for all app + API routes
    ├── lib/
    │   ├── prisma.ts         # Shared Prisma client
    │   ├── auth.ts           # NextAuth config (credentials + JWT)
    │   ├── session.ts        # getCurrentUser() server helper
    │   ├── permissions.ts    # RBAC table — the real authorization boundary
    │   └── numbering.ts      # PRJ/WO/PE/DWG/QC/DSP/MAT sequence generator
    ├── components/           # Sidebar, StatusBadge, ProgressBar
    └── app/
        ├── login/
        ├── api/
        │   ├── auth/[...nextauth]/
        │   ├── projects/            # GET list+create, GET [id]
        │   ├── work-orders/         # GET list (with ?scope=plant), POST create
        │   │   └── [id]/release/    # DRAFT → RELEASED transition
        │   ├── materials/           # GET/POST material master
        │   │   └── transactions/    # RECEIPT/ISSUE/RETURN/ADJUSTMENT/SCRAP ledger
        │   ├── production-entries/  # Plant production submission
        │   ├── drawings/            # Drawing + revision upload metadata
        │   └── customers/
        ├── (office)/         # Office/Management UI — dashboard, projects,
        │   │                   work-orders, drawings, materials
        └── (plant)/          # Plant UI — simple, fast, large-button forms
```

## 3. Roles (enforced in `src/lib/permissions.ts`)

`ADMIN`, `MANAGEMENT`, `OFFICE`, `PLANT_MANAGER`, `PRODUCTION`, `STORE`, `QC`,
`DISPATCH` — matching the spec exactly. A `PRODUCTION` user cannot create or
release work orders, edit commercial fields, or delete anything; a
`PLANT_MANAGER`/`STORE` user can see materials but not commercial project data.

## 4. Local setup

```bash
cp .env.example .env          # then edit DATABASE_URL / NEXTAUTH_SECRET

# Start Postgres only (recommended for local dev — run the app with `npm run dev`)
docker compose up -d db

npm install
npx prisma migrate dev --name init   # creates all tables
npm run db:seed                      # loads the Sobha Steel Fabrication demo
npm run dev                          # http://localhost:3000
```

Demo accounts (password for all: `demo1234`):

| Email                        | Role          |
|-------------------------------|---------------|
| admin@opussteel.ae            | ADMIN         |
| office@opussteel.ae           | OFFICE        |
| management@opussteel.ae       | MANAGEMENT    |
| plantmanager@opussteel.ae     | PLANT_MANAGER |
| plant@opussteel.ae            | PRODUCTION    |
| store@opussteel.ae            | STORE         |
| qc@opussteel.ae               | QC            |
| dispatch@opussteel.ae         | DISPATCH      |

To run the whole stack (app + db) in Docker instead: `docker compose up --build`.

> This code was written and reviewed in a sandboxed container without access
> to `registry.npmjs.org`'s Prisma-engine mirror (`binaries.prisma.sh`), so
> `npx prisma generate` / `migrate` could not be executed end-to-end here.
> The schema and code were reviewed by hand for consistency; run the commands
> above in your own environment (which will have normal internet access) to
> generate the client and create the database.

## 5. The first milestone (matches the demo scenario)

The seed script (`prisma/seed.ts`) plays out exactly the scenario from the
spec: Office creates **Project: Sobha Steel Fabrication**, creates and
releases **WO-2026-00001 (Bracket Assembly, 100 Nos, 10,000 KG planned)**,
Store issues 10,500 KG of plate, Plant logs two production entries
(25 + 25 = 50 Nos, 4,700 KG used, 180 KG scrap), QC passes 48 / fails 2, and
Dispatch ships the 48 passed units. Sign in as `office@opussteel.ae`, open
the project, and you'll see all of this already computed — then sign in as
`plant@opussteel.ae` to submit a third production entry yourself and watch
the progress bar and steel-consumption numbers update live.

## 6. Data-integrity rules already enforced

- Only `DRAFT` work orders can be released; releasing notifies plant managers automatically (`/api/work-orders/[id]/release`).
- Completed production quantity cannot exceed planned quantity (`/api/production-entries`).
- Material cannot be issued beyond current calculated stock (`/api/materials/transactions`).
- Production cannot be recorded against a `CANCELLED` work order.
- Drawing revisions are **appended**, never overwritten (`/api/drawings`).
- Every work order create/release and material transaction writes an `AuditLog` row.
- Planned figures (`WorkOrderItem.plannedQuantity`, `plannedWeightKg`) are stored
  separately from actuals (`ProductionEntry`, `MaterialTransaction`) and are
  never mutated by production or store activity — only ever compared against
  it, per rule #39.

## 7. Roadmap (not yet built — by phase)

**Phase 2 remainder**: production/steel-consumption charts (Recharts is already
a dependency), scrap-reason reporting UI.
**Phase 3 remainder**: QC and Dispatch *forms* (the data model and seed data
exist; only the office/plant UI for creating new inspections and dispatches
from scratch is still needed — today they're demonstrated via the seed script).
**Phase 4**: Reports (Excel/CSV/PDF export), in-app notification center UI
(the `Notification` rows are already being created), a visible audit-log page,
Excel import for projects/materials/customers/work orders.
**Phase 5**: Zoho Books sync (Sales Order → Project/WorkOrder inbound;
Dispatch-completed → invoice trigger outbound). File uploads to S3-compatible
storage for drawings/photos (currently only metadata is modelled).

## 8. Security notes

- All mutations check `src/lib/permissions.ts` server-side; `src/middleware.ts`
  requires a session for every app and API route in the matcher list.
- Passwords are hashed with bcrypt; never logged or returned by any API.
- Change `NEXTAUTH_SECRET` before any real deployment; never commit `.env`.
