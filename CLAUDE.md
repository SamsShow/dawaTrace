# DawaTrace — Developer Guide for Claude Code

## What This Is
A blockchain pharmaceutical supply chain platform for CDAC Blockchain India Challenge 2026.
- **Sui** (public L1) — all supply chain logic + public verification, Move contracts
- **Web app** (Next.js 15) — regulator dashboard + API (GraphQL), deployed on Vercel

## Current Status
- **Landing page, dashboard, docs, about** — fully working
- **Auth** — NextAuth v5 (Auth.js) with Credentials provider, bcrypt, JWT strategy
- **Registration** — tiered invite system (REG→MFG→DIST→CHEM), database-backed
- **GraphQL API** — queries return static seed data; mutations are stubs (return success but don't persist)
- **Sui reads** — `verifyBatch` and `getCustodyChain` query Sui devnet via SuiClient
- **Sui writes** — NOT wired yet. Mutations in `src/lib/server/store.ts` are TODO stubs
- **Move contracts** — compiled, tested, but not deployed to devnet yet
- **Database** — Neon Postgres (users + invitations tables)
- **Dark mode** — next-themes with system/light/dark support

### What Needs To Be Done
1. Deploy Move contracts to Sui devnet (`make sui-deploy`)
2. Wire store.ts mutation stubs to submit Sui PTBs (programmable transaction blocks)
3. Replace seed data queries with on-chain reads from Sui
4. Implement export endpoints (`/api/exports/batches`, `/api/exports/recalls`)
5. Update infra/monitoring dashboards for Sui-only architecture

## Project Structure
```
dawatrace/                 ← Next.js app root
├── src/
│   ├── app/              App Router pages + API routes
│   │   ├── api/graphql/  Apollo Server GraphQL endpoint
│   │   ├── api/auth/     NextAuth handlers + registration endpoint
│   │   ├── api/health/   Health check
│   │   ├── (dashboard)/  Authenticated dashboard pages (9 pages)
│   │   ├── about/        CDAC submission page (public)
│   │   ├── docs/         Developer documentation (public)
│   │   ├── login/        Login + Register (combined, mode-switched)
│   │   └── register/     Redirects to /login?mode=register
│   ├── components/       React components (UI + feature)
│   │   └── docs/         Shared doc page primitives
│   ├── hooks/            Apollo Client hooks (useBatch, useAdmin, useInvitations, etc.)
│   ├── lib/
│   │   ├── auth.ts       NextAuth exports (handlers, auth, signIn, signOut)
│   │   ├── auth-config.ts Credentials provider + JWT callbacks
│   │   ├── types.ts      Shared types (Batch, OrgRole, AuthUser, etc.)
│   │   └── server/       Server-only code
│   │       ├── db.ts     Neon Postgres client singleton
│   │       ├── store.ts  Static seed data + mutation stubs (TODO: wire to Sui)
│   │       ├── sui/      SuiClient singleton + on-chain queries
│   │       ├── graphql/  Schema + resolvers
│   │       ├── anomaly/  Batch anomaly detection
│   │       └── config.ts Env var validation (zod)
│   └── i18n/             11-language support
├── sui/                  Move smart contracts
│   └── sources/
│       ├── batch.move        BatchObject, mint_batch, mark_recalled, verify_batch
│       ├── custody.move      CustodyRecord (frozen), record_transfer
│       ├── dawa_points.move  Non-transferable loyalty points
│       ├── export_passport.move  Export NFT for LayerZero verification
│       └── bridge_cap.move   Capability-based access control
├── middleware.ts         NextAuth route protection
├── infra/                Docker Compose, Nginx
├── docs/                 Project description, specs, plans
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Key Commands
```bash
# Start Next.js app (dashboard + API)
npm run dev

# Publish Sui contracts to devnet
make sui-deploy

# Run Move tests
make sui-test

# Build for production
npm run build
```

## Environment Variables
Copy `.env.example` to `.env`. All vars:
- `SUI_RPC_URL` — Sui fullnode RPC (default: devnet)
- `SUI_PACKAGE_ID` — Published Sui package ID (set after `make sui-deploy`)
- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_SECRET` — NextAuth secret (run `npx auth secret` to generate)

## Architecture

### Auth Flow (NextAuth v5)
1. User submits nodeId + password on `/login` page
2. NextAuth Credentials provider queries `users` table, validates bcrypt hash
3. JWT token issued with `nodeId` + `orgRole` claims
4. `SessionProvider` wraps app, `useSession()` available in client components
5. `middleware.ts` protects dashboard routes — redirects unauthenticated to `/login`
6. GraphQL resolvers receive session via context

### Registration Flow (Tiered Invitations)
1. Authenticated user creates invite via GraphQL `createInvitation` mutation
2. Tier rules enforced: REGULATOR→any, MANUFACTURER→DISTRIBUTOR, DISTRIBUTOR→CHEMIST
3. 6-char invite code generated (72h expiry, single-use)
4. New user enters code on `/login?mode=register`, fills org details
5. `POST /api/auth/register` validates code, hashes password, creates user
6. Node ID auto-generated based on role (e.g., `SUN-MFG-001`, `DIST-MAH-002`)

### Data Flow
```
Browser → Apollo Client
  → /api/graphql (Next.js API route)
    → resolvers call store.ts (seed data) or sui/queries.ts (on-chain reads)
      → SuiClient reads from Sui devnet RPC
```

### Serverless Considerations
- **No mutable server state.** `store.ts` uses `readonly` static arrays. Mutations are stubs.
- **SuiClient is stateless** (HTTP RPC wrapper), safe as module-level singleton.
- **Apollo Server** instantiated at module scope, works with Vercel serverless functions.
- **Neon client** is stateless (HTTP-based), safe as module-level singleton.

### Sui Move Contracts
- **Access control**: `BridgeCapability` object required for all write operations
- **BatchObject**: `has key, store` — transferable, tracks batch lifecycle
- **CustodyRecord**: created via `record_transfer`, then frozen (public read access)
- **DawaPointsLedger**: `has key` only (no `store`) — enforces non-transferability at VM level
- **ExportPassport**: NFT for export-destined batches, bridgeable via LayerZero

### Database (Neon Postgres)
- **users** — node_id, password_hash (bcrypt), org_role, org_name, drug_license_number, state, invited_by, status
- **invitations** — invite_code, inviter_node_id, target_role, expires_at, used_by, used_at
- Seeded regulator: `CDSCO-REG-001` / `admin`

## Important Constraints
- Sui package name: `dawa_trace` (in Move.toml)
- All access control via Sui capability objects (BridgeCapability, AdminCapability)
- Never commit private keys or `.env`
- `patientHash` field = SHA3-256(aadhaar + batchId + timestamp), never raw Aadhaar
- Dev login: nodeId `CDSCO-REG-001` / password `admin`
- Badge variants: only `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` (no `success`/`warning`)
- CSS variables use `oklch()` format (not `hsl`)
- Tailwind config maps colors via `var(--color)` directly (not `hsl(var(...))`)
