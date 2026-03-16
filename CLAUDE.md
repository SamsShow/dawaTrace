# DawaTrace — Developer Guide for Claude Code

## What This Is
A hybrid blockchain pharmaceutical supply chain platform for CDAC Blockchain India Challenge 2026.
- **Hyperledger Fabric** (permissioned) — regulatory core, Go chaincode
- **Sui** (public L1) — public verification layer, Move contracts
- **Bridge relay** (TypeScript) — hash-anchors Fabric state changes to Sui; drives <60s recall SLA
- **API gateway** (Node.js + Express + Apollo GraphQL)
- **Web dashboard** (React + Vite + Tailwind) — regulator-facing
- **Mobile app** (React Native + Expo Router) — chemist/patient; offline-capable, Hindi + 10 languages

## Monorepo Layout
```
dawaTrace/
├── fabric/           Go chaincode + Fabric network config
├── sui/              Move smart contracts
├── api/              Express + Apollo GraphQL gateway (@dawaTrace/api)
├── bridge/           Fabric→Sui hash-anchor relay (@dawaTrace/bridge)
├── apps/web/         Vite + React regulator dashboard (@dawaTrace/web)
├── apps/mobile/      Expo Router RN app (@dawaTrace/mobile)
└── infra/            Docker Compose, Prometheus, Grafana, Nginx
```

## Key Commands
```bash
# Start local Fabric network (Docker)
make fabric-up

# Deploy chaincode (after fabric-up)
make deploy-cc

# Publish Sui contracts to devnet
make sui-deploy

# Start API + bridge in dev mode
pnpm dev --filter @dawaTrace/api --filter @dawaTrace/bridge

# Start web dashboard
pnpm dev --filter @dawaTrace/web

# Run all TypeScript tests
pnpm test

# Run Go chaincode tests
cd fabric/chaincode/dawaTrace && go test ./...

# Run Move tests
cd sui && sui move test

# Simulate a recall drill (end-to-end SLA test)
make recall-drill
```

## Environment Variables
Copy `.env.example` to `.env`. Critical vars:
- `FABRIC_GATEWAY_ENDPOINT` — grpc://localhost:7051
- `FABRIC_TLS_CERT_PATH` — path to peer TLS cert
- `SUI_RPC_URL` — https://fullnode.devnet.sui.io:443
- `BRIDGE_SUI_PRIVATE_KEY` — Ed25519 hex key (C-DAC relay signer, never commit)
- `BRIDGE_CAPABILITY_ID` — Sui Object ID of BridgeCapability object
- `BRIDGE_PACKAGE_ID` — Published Sui package ID
- `REDIS_URL` — redis://localhost:6379 (bridge retry queue)
- `API_JWT_SECRET` — JWT signing secret
- `API_PORT` — default 3000

## Architecture Notes

### Fabric → Sui Flow
1. Client calls `mintBatch` on Fabric chaincode
2. Chaincode emits `MintEvent` (JSON: batchId, hash, timestamp)
3. Bridge listener (`bridge/src/listener.ts`) receives event via Fabric Gateway SDK
4. Bridge computes SHA3-256 of batch data, submits PTB to Sui via C-DAC signer
5. Sui `batch.move` creates BatchObject, anchors hash

### Recall Flow (must complete <60s end-to-end)
1. Regulator calls `issueRecall` on Fabric
2. Fabric marks batch `RECALLED`, emits `RecallEvent`
3. Bridge receives event → URGENT queue lane → calls `mark_recalled` on Sui within ~5s
4. WebSocket event propagates to web dashboard + mobile app
5. Target: Fabric commit + Sui anchor + UI update < 60s

### Chemist Suspension Logic
`flagChemist` increments violation counter. At threshold (default 3), status flips to `SUSPENDED_REVIEW`. Human regulator must lift via admin call.

### Offline Mode (Mobile)
Chemist dispenses offline → stored in SQLite sync queue. On reconnect → `useOfflineSync` flushes queue to API → Fabric commit happens. `verifyBatch` reads Sui directly (public RPC, no API needed).

### zkLogin (Mobile)
Uses Sui zkLogin with Aadhaar as OIDC provider (future: UIDAI support; for now Google OAuth as placeholder). See `apps/mobile/src/hooks/useZkLogin.ts`.

### Privacy
Raw Aadhaar numbers are NEVER stored on-chain. The mobile app hashes `SHA3-256(aadhaarNumber + batchId + timestamp)` client-side. PDPB compliant.

## Important Constraints
- Fabric channel name: `dawaTrace-channel`
- Chaincode name: `dawaTrace`
- Go module: `github.com/dawaTrace/chaincode`
- Sui package name: `dawa_trace` (in Move.toml)
- All Fabric orgs use ECDSA P-256 keys (not RSA)
- Bridge must be run by C-DAC org keypair only
- Never commit private keys; use env vars or HSM references in prod
- `patientHash` field = SHA3-256, never raw Aadhaar
