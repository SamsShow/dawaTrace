# DawaTrace — Developer Guide for Claude Code

## What This Is
A blockchain pharmaceutical supply chain platform for CDAC Blockchain India Challenge 2026.
- **Sui** (public L1) — all supply chain logic + public verification, Move contracts
- **Web app** (Next.js) — regulator dashboard + API (GraphQL + REST)

## Project Structure (Next.js at root)
```
dawatrace/                 ← Next.js app root
├── src/
│   ├── app/              App Router pages + API routes
│   ├── components/       React components (UI + feature)
│   ├── hooks/            Client-side hooks
│   ├── lib/              Shared types, utils, auth
│   ├── lib/server/       Server-only code (Sui queries, GraphQL, store)
│   └── i18n/             10-language support
├── sui/                  Move smart contracts
├── infra/                Docker Compose, Prometheus, Grafana, Nginx
├── package.json          Next.js dependencies
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Key Commands
```bash
# Publish Sui contracts to devnet
make sui-deploy

# Run Move tests
cd sui && sui move test

# Start Next.js app (dashboard + API)
npm run dev
```

## Environment Variables
Copy `.env.example` to `.env`. Critical vars:
- `SUI_RPC_URL` — https://fullnode.devnet.sui.io:443
- `SUI_PACKAGE_ID` — Published Sui package ID (set after sui-deploy)
- `API_JWT_SECRET` — JWT signing secret

## Architecture Notes

### Supply Chain Flow
1. Manufacturer calls `mint_batch` on Sui
2. Distributor calls `transfer_custody` to record handoff
3. Chemist dispenses to patient
4. All state is on-chain and publicly verifiable

### Recall Flow (must complete <60s end-to-end)
1. Regulator calls `mark_recalled` on Sui
2. BatchObject.recalled = true on-chain
3. Web dashboard updates via polling

### Web App (Next.js)
- `/api/graphql` — Apollo Server GraphQL endpoint
- `/api/health` — Health check
- All dashboard pages use Apollo Client with polling
- Server-side code in `src/lib/server/` (Sui queries, resolvers, in-memory store)
- In-memory mock store for development

## Important Constraints
- Sui package name: `dawa_trace` (in Move.toml)
- All access control via Sui capability objects
- Never commit private keys
- `patientHash` field = SHA3-256, never raw Aadhaar
