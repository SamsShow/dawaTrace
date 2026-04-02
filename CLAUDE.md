# DawaTrace — Developer Guide for Claude Code

## What This Is
A blockchain pharmaceutical supply chain platform for CDAC Blockchain India Challenge 2026.
- **Sui** (public L1) — all supply chain logic + public verification, Move contracts
- **Web app** (Next.js 15) — regulator dashboard + API (GraphQL), deployed on Vercel

## Current Status
- **Landing page, dashboard, docs** — fully working
- **Auth** — real JWT flow via `/api/auth/login` (dev credentials in route handler)
- **GraphQL API** — queries return static seed data; mutations are stubs (return success but don't persist)
- **Sui reads** — `verifyBatch` and `getCustodyChain` query Sui devnet via SuiClient
- **Sui writes** — NOT wired yet. Mutations in `src/lib/server/store.ts` are TODO stubs
- **Move contracts** — compiled, tested, but not deployed to devnet yet

### What Needs To Be Done
1. Deploy Move contracts to Sui devnet (`make sui-deploy`)
2. Wire store.ts mutation stubs to submit Sui PTBs (programmable transaction blocks)
3. Replace seed data queries with on-chain reads from Sui
4. Add real identity provider for auth (currently dev credentials hardcoded)
5. Update infra/monitoring dashboards for Sui-only architecture

## Project Structure
```
dawatrace/                 ← Next.js app root
├── src/
│   ├── app/              App Router pages + API routes
│   │   ├── api/graphql/  Apollo Server GraphQL endpoint
│   │   ├── api/auth/     JWT login endpoint
│   │   ├── api/health/   Health check
│   │   ├── (dashboard)/  Authenticated dashboard pages
│   │   ├── docs/         Documentation page
│   │   └── login/        Login page
│   ├── components/       React components (UI + feature)
│   ├── hooks/            Apollo Client hooks (useBatch, useAdmin, etc.)
│   ├── lib/              Shared types, utils, auth (client-safe)
│   ├── lib/server/       Server-only code
│   │   ├── store.ts      Static seed data + mutation stubs (TODO: wire to Sui)
│   │   ├── sui/          SuiClient singleton + on-chain queries
│   │   ├── graphql/      Schema + resolvers
│   │   ├── anomaly/      Batch anomaly detection
│   │   └── config.ts     Env var validation (zod)
│   └── i18n/             10-language support
├── sui/                  Move smart contracts
│   └── sources/
│       ├── batch.move        BatchObject, mint_batch, mark_recalled, verify_batch
│       ├── custody.move      CustodyRecord (frozen), record_transfer
│       ├── dawa_points.move  Non-transferable loyalty points
│       ├── export_passport.move  Export NFT for LayerZero verification
│       └── bridge_cap.move   Capability-based access control
├── infra/                Docker Compose, Prometheus, Grafana, Nginx
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
- `API_JWT_SECRET` — JWT signing secret (min 32 chars)

## Architecture

### Data Flow
```
Browser → Apollo Client (with JWT auth header)
  → /api/graphql (Next.js API route)
    → resolvers call store.ts (seed data) or sui/queries.ts (on-chain reads)
      → SuiClient reads from Sui devnet RPC
```

### Auth Flow
1. User submits nodeId + password to `/api/auth/login`
2. Server validates credentials, returns signed JWT
3. Client stores JWT in localStorage via `src/lib/auth.ts`
4. Apollo Client attaches `Authorization: Bearer <jwt>` to every request via `setContext`
5. GraphQL route extracts + verifies JWT, passes user to resolver context

### Serverless Considerations
- **No mutable server state.** `store.ts` uses `readonly` static arrays. Mutations are stubs.
- **SuiClient is stateless** (HTTP RPC wrapper), safe as module-level singleton.
- **Apollo Server** instantiated at module scope, works with Vercel serverless functions.

### Sui Move Contracts
- **Access control**: `BridgeCapability` object required for all write operations
- **BatchObject**: `has key, store` — transferable, tracks batch lifecycle
- **CustodyRecord**: created via `record_transfer`, then frozen (public read access)
- **DawaPointsLedger**: `has key` only (no `store`) — enforces non-transferability at VM level
- **ExportPassport**: NFT for export-destined batches, bridgeable via LayerZero

## Important Constraints
- Sui package name: `dawa_trace` (in Move.toml)
- All access control via Sui capability objects (BridgeCapability, AdminCapability)
- Never commit private keys or `.env`
- `patientHash` field = SHA3-256(aadhaar + batchId + timestamp), never raw Aadhaar
- Dev login credentials: nodeId `CDSCO-REG-001` / password `admin` (see `/api/auth/login`)
