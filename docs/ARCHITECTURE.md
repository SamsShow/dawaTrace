# DawaTrace — Architecture Document

## System Overview

DawaTrace is a pharmaceutical supply chain tracking platform built on Sui blockchain for the CDAC Blockchain India Challenge 2026. It provides batch lifecycle tracking, custody chain audit, sub-60s recall propagation, and public QR verification.

```
                                ┌─────────────────────────────────┐
                                │        Sui Blockchain           │
                                │  (Move Smart Contracts)         │
                                │                                 │
                                │  BatchObject   CustodyRecord    │
                                │  DawaPoints    ExportPassport   │
                                │  BridgeCapability               │
                                └───────────┬─────────────────────┘
                                            │ SuiClient (RPC)
                                            │
┌──────────────┐   HTTPS    ┌───────────────┴──────────────────────┐
│              │ ──────────>│         Next.js 15 (Vercel)          │
│   Browser    │            │                                      │
│  (React 19)  │<───────────│  ┌─────────┐  ┌──────────┐          │
│              │   JSON     │  │ NextAuth │  │ GraphQL  │          │
│  - Dashboard │            │  │  v5      │  │ (Apollo) │          │
│  - Login     │            │  └────┬─────┘  └────┬─────┘          │
│  - Register  │            │       │              │               │
│  - About     │            │       ▼              ▼               │
│  - Docs      │            │  ┌─────────┐  ┌──────────┐          │
└──────────────┘            │  │  Neon    │  │ store.ts │          │
                            │  │ Postgres │  │ (seed)   │          │
                            │  └─────────┘  └──────────┘          │
                            └──────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Blockchain | Sui (Move) | devnet | Supply chain state, access control, public verification |
| Framework | Next.js (App Router) | 15.1 | SSR, API routes, serverless deployment |
| Auth | NextAuth (Auth.js) | 5.0-beta.30 | Credentials provider, JWT sessions, route protection |
| API | Apollo Server + GraphQL | 4.11 | Typed query/mutation API |
| Database | Neon Postgres | serverless | User accounts, invitations |
| UI | React 19, Tailwind CSS, shadcn/ui | - | Component library, theming |
| Charts | Recharts | 2.12 | Analytics visualizations |
| i18n | i18next | 23.14 | 11 Indian languages |
| Theme | next-themes | - | System/light/dark mode |
| Deploy | Vercel | serverless | Auto-scaling, edge functions |

## Authentication & Authorization

### Auth Stack

```
NextAuth v5 (Auth.js)
├── Provider: Credentials (nodeId + password)
├── Strategy: JWT (not database sessions)
├── Storage: Neon Postgres (users table)
├── Hashing: bcrypt (cost factor 10)
└── Protection: middleware.ts (route matcher)
```

### Auth Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ LOGIN                                                               │
│                                                                     │
│  /login page                                                        │
│    │                                                                │
│    ▼                                                                │
│  signIn("credentials", { nodeId, password })                        │
│    │                                                                │
│    ▼                                                                │
│  auth-config.ts → authorize()                                       │
│    │  1. Query users table by node_id                               │
│    │  2. Check status === 'ACTIVE'                                  │
│    │  3. bcrypt.compare(password, password_hash)                    │
│    │  4. Return { id, nodeId, orgRole }                             │
│    │                                                                │
│    ▼                                                                │
│  JWT callback → attach nodeId + orgRole to token                    │
│    │                                                                │
│    ▼                                                                │
│  Session callback → expose nodeId + orgRole in session              │
│    │                                                                │
│    ▼                                                                │
│  SessionProvider → useSession() available in all client components   │
└─────────────────────────────────────────────────────────────────────┘
```

### Route Protection

```typescript
// middleware.ts
export { auth as middleware } from '@/lib/auth';

// Protected routes:
/dashboard/*  /batches/*  /recalls/*  /analytics/*
/admin/*      /reports/*  /invitations/*
```

Unauthenticated requests to protected routes redirect to `/login`.

### Role-Based Access Control

| Role | Dashboard | Batches | Recalls | Analytics | Admin | Reports | Invitations |
|------|-----------|---------|---------|-----------|-------|---------|-------------|
| REGULATOR | Full | All batches | Issue/view | Full | Full | Resolve | Invite any role |
| MANUFACTURER | Full | Own batches | View | Limited | - | - | Invite DISTRIBUTOR |
| DISTRIBUTOR | Full | Custody batches | View | Limited | - | - | Invite CHEMIST |
| CHEMIST | Full | Held batches | View | Limited | - | - | - |

REGULATOR bypasses all restrictions (god-mode for testing).

## Tiered Registration System

```
┌──────────┐     invites     ┌──────────────┐     invites     ┌─────────────┐     invites     ┌─────────┐
│  CDSCO   │ ──────────────> │ Manufacturer │ ──────────────> │ Distributor │ ──────────────> │ Chemist │
│(seeded)  │                 │              │                 │             │                 │         │
└──────────┘                 └──────────────┘                 └─────────────┘                 └─────────┘
     │                              │                                │
     │ can also invite              │ can only invite                │ can only invite
     │ DIST + CHEM directly         │ DISTRIBUTOR                    │ CHEMIST
     ▼                              ▼                                ▼
```

### Invite Code Lifecycle

```
Create (GraphQL mutation)  →  6-char code (72h expiry)  →  Share out-of-band
                                                              │
                                                              ▼
                                            /login?mode=register  →  POST /api/auth/register
                                                                        │
                                                                        ▼
                                                              Validate code + create user
                                                              Mark invitation as used
```

### Node ID Generation

| Role | Format | Example |
|------|--------|---------|
| REGULATOR | `{ORG}-REG-{seq}` | `CDSCO-REG-001` |
| MANUFACTURER | `{ORG}-MFG-{seq}` | `SUN-MFG-001` |
| DISTRIBUTOR | `DIST-{STATE}-{seq}` | `DIST-MAH-002` |
| CHEMIST | `CHEM-{STATE}-{seq}` | `CHEM-DEL-0003` |

## Database Schema

**Provider:** Neon Postgres (serverless, `aws-ap-southeast-1`)
**Driver:** `@neondatabase/serverless` (HTTP-based, no persistent connections)

```sql
users
├── id              SERIAL PRIMARY KEY
├── node_id         VARCHAR(64) UNIQUE NOT NULL
├── password_hash   VARCHAR(255) NOT NULL        -- bcrypt
├── org_role        VARCHAR(32) NOT NULL          -- REGULATOR | MANUFACTURER | DISTRIBUTOR | CHEMIST
├── org_name        VARCHAR(255) NOT NULL
├── drug_license_number VARCHAR(64)
├── state           VARCHAR(64)
├── invited_by      VARCHAR(64) → users(node_id)
├── status          VARCHAR(16) DEFAULT 'ACTIVE'  -- ACTIVE | SUSPENDED | PENDING
├── created_at      TIMESTAMPTZ DEFAULT NOW()
└── updated_at      TIMESTAMPTZ DEFAULT NOW()

invitations
├── id              SERIAL PRIMARY KEY
├── invite_code     VARCHAR(64) UNIQUE NOT NULL
├── inviter_node_id VARCHAR(64) → users(node_id)
├── target_role     VARCHAR(32) NOT NULL
├── target_org_name VARCHAR(255)
├── expires_at      TIMESTAMPTZ NOT NULL
├── used_by         VARCHAR(64) → users(node_id)
├── used_at         TIMESTAMPTZ
└── created_at      TIMESTAMPTZ DEFAULT NOW()
```

## GraphQL API

**Endpoint:** `POST /api/graphql`

### Queries

| Query | Returns | Auth Required | Notes |
|-------|---------|--------------|-------|
| `batches` | `[Batch]` | Yes | All batches (seed data) |
| `batch(batchId)` | `Batch` | Yes | Single batch lookup |
| `recalls` | `[RecallRecord]` | Yes | All recall records |
| `recall(batchId)` | `RecallRecord` | Yes | Single recall lookup |
| `verifyBatch(suiObjectId)` | `BatchVerification` | No | Live Sui RPC query |
| `anomalies(limit)` | `[AnomalyAlert]` | Yes | Anomaly detection results |
| `analytics` | `AnalyticsData` | Yes | Aggregated stats + charts |
| `chemistViolations` | `[ChemistViolation]` | Yes | Flagged chemists |
| `reports` | `[Report]` | Yes | Whistleblower reports |
| `myInvitations` | `[Invitation]` | Yes | Current user's invitations |

### Mutations

| Mutation | Auth | Role | Status |
|----------|------|------|--------|
| `mintBatch(...)` | Yes | MFG/REG | Stub (TODO: Sui PTB) |
| `transferBatch(...)` | Yes | MFG/DIST/REG | Stub |
| `issueRecall(...)` | Yes | REG | Stub |
| `bulkRecall(...)` | Yes | REG | Stub |
| `flagChemist(...)` | Yes | REG | Stub |
| `liftSuspension(...)` | Yes | REG | Stub |
| `submitReport(...)` | Yes | Any | Stub |
| `resolveReport(...)` | Yes | REG | Stub |
| `createInvitation(...)` | Yes | Per tier rules | Working (DB) |

## Sui Move Contracts

**Package:** `dawa_trace` (in `sui/sources/`)

```
┌─────────────────────────────────────────────────────────┐
│                    bridge_cap.move                       │
│  BridgeCapability (key only) — required for all writes  │
│  AdminCapability (key only) — transfers BridgeCap       │
│  init() creates both, transfers to deployer             │
└──────────────────────┬──────────────────────────────────┘
                       │ requires &BridgeCapability
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
   ┌────────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐
   │ batch.move │ │custody.  │ │dawa_points.│ │export_passport│
   │            │ │move      │ │move        │ │.move          │
   │ BatchObject│ │CustodyRec│ │DawaPoints  │ │ExportPassport │
   │ (key,store)│ │(key,     │ │Ledger      │ │(key, store)   │
   │            │ │ frozen)  │ │(key only)  │ │               │
   │ mint_batch │ │record_   │ │award_points│ │mint_export_   │
   │ mark_      │ │transfer  │ │top_up      │ │passport       │
   │  recalled  │ │          │ │redeem_     │ │invalidate_    │
   │ anchor_hash│ │          │ │ points     │ │ passport      │
   │ verify_    │ │          │ │            │ │               │
   │  batch     │ │          │ │            │ │               │
   └────────────┘ └──────────┘ └────────────┘ └───────────────┘
```

### Key Design Patterns

| Pattern | Implementation | Why |
|---------|---------------|-----|
| Capability-gated access | `&BridgeCapability` param on all writes | No address allowlists, supports key rotation |
| Frozen records | `transfer::freeze_object(record)` for CustodyRecord | Immutable audit trail, publicly readable |
| VM-enforced non-transfer | DawaPointsLedger: `has key` (no `store`) | Cannot be transferred/wrapped by any external code |
| Hash anchoring | `data_hash: vector<u8>` on BatchObject | Integrity proof — off-chain tampering is detectable |

## Client Architecture

### Provider Stack

```
<SessionProvider>           ← NextAuth session context
  <ThemeProvider>           ← next-themes (system/light/dark)
    <ApolloProvider>        ← GraphQL client → /api/graphql
      {children}
    </ApolloProvider>
  </ThemeProvider>
</SessionProvider>
```

### Dashboard Pages (9 total)

| Page | Route | Key Features |
|------|-------|-------------|
| Overview | `/dashboard` | Stat cards, recent activity feed, quick actions |
| Batches | `/batches` | Batch table, mint form, CSV/JSON export |
| Batch Detail | `/batches/[batchId]` | Full details, custody timeline, transfer/recall forms |
| Recalls | `/recalls` | Recall table, export buttons |
| Analytics | `/analytics` | Pie chart (status), area chart (30-day activity), system health |
| Admin | `/admin` | Chemist violations, bulk recall, lift suspension |
| Reports | `/reports` | Whistleblower reports, resolve with status |
| Invitations | `/invitations` | Create invites, copy codes, status tracking |

### Public Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Hero, features, stakeholders, stack, CTA |
| About | `/about` | Full CDAC submission (11 sections, sidebar TOC) |
| Docs | `/docs` | Developer guide |
| Login | `/login` | Login + register (mode-switched) |

## Anomaly Detection

Rule-based engine at `src/lib/server/anomaly/detector.ts`:

| Alert Type | Trigger |
|-----------|---------|
| `EXPIRED_DISPENSED` | Batch past expiry but still ACTIVE/IN_TRANSIT |
| `QUANTITY_MISMATCH` | Batch with zero or negative quantity |
| `RAPID_TRANSFER` | Batch moved to IN_TRANSIT within 1 hour of creation |
| `SUSPENDED_CHEMIST` | Batch held by chemist under suspension review |

## Internationalization

11 languages via i18next + react-i18next:

English, Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi

Language selector in sidebar. Translations in `src/i18n/locales/*.ts`.

## Infrastructure

```
Vercel (Production)
├── Serverless Functions (API routes, SSR)
├── Static Assets (landing, about, docs)
└── Edge Middleware (auth route protection)

Neon Postgres (Database)
├── aws-ap-southeast-1 (Singapore)
├── Serverless driver (HTTP, no persistent connections)
└── Auto-suspend on idle

Sui Devnet (Blockchain)
├── Public RPC: fullnode.devnet.sui.io
└── Move contracts (not yet deployed)

Docker (Optional local infra)
├── docker-compose.yml
├── Nginx reverse proxy
└── Next.js container
```

## Security

| Concern | Mitigation |
|---------|-----------|
| Password storage | bcrypt (cost 10) |
| Session management | JWT via NextAuth, httpOnly cookies |
| Route protection | Middleware matcher on all dashboard routes |
| RBAC | Role checked in GraphQL resolvers |
| On-chain access | Capability objects (BridgeCapability) |
| Patient privacy | SHA3-256(aadhaar + batchId + timestamp), never raw Aadhaar |
| Invite codes | 6-char alphanumeric (no ambiguous chars), 72h expiry, single-use |
| Env validation | Zod schema at startup (`config.ts`) |

## What's Working vs TODO

| Component | Status |
|-----------|--------|
| Auth (login/register/logout) | Working |
| Tiered invitations | Working |
| Dashboard UI (all 9 pages) | Working |
| Dark mode | Working |
| i18n (11 languages) | Working |
| GraphQL queries (seed data) | Working |
| Sui reads (verifyBatch, getCustodyChain) | Working |
| Anomaly detection | Working |
| GraphQL mutations | Stubs (return success, don't persist) |
| Sui writes (PTBs) | Not wired |
| Move contract deployment | Not deployed |
| Export endpoints (CSV/JSON) | Not implemented |
| Monitoring (Prometheus/Grafana) | Not configured |
