# DawaTrace — Project Description

**CDAC Blockchain India Challenge 2026**
**Category:** Healthcare & Pharmaceutical Supply Chain
**Team:** DawaTrace

---

## 1. Problem Statement

India is the world's largest provider of generic medicines, supplying over 50% of global demand for vaccines and 40% of generic drug demand in the US. Yet the domestic pharmaceutical supply chain remains plagued by counterfeit drugs, opaque custody chains, and slow recall response times.

**Key challenges:**

- **Counterfeit drugs** account for an estimated 10–30% of medicines in developing countries (WHO). In India, CDSCO has identified substandard drugs across multiple states, but enforcement is fragmented across 36 state drug authorities.
- **Recall propagation is slow.** When CDSCO identifies a dangerous batch, the current recall process relies on manual notifications through state drug controllers, wholesalers, and retail chemists. This can take days or weeks — during which patients continue consuming recalled medicines.
- **No public verification.** A patient standing at a pharmacy counter has no way to independently verify whether a medicine batch is authentic, recalled, or expired. They must trust every intermediary in the chain.
- **Privacy risks.** Any digital tracking system that handles patient identity must comply with the Personal Data Protection Bill (PDPB) 2023, which mandates that sensitive identifiers like Aadhaar numbers must not be stored in plaintext by third parties.

## 2. Solution Overview

DawaTrace is a blockchain-based pharmaceutical supply chain platform built on Sui that provides end-to-end tracking of medicine batches from manufacturer to patient, with a target recall propagation time of under 60 seconds.

### Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Batch lifecycle tracking** | Every medicine batch is minted as a `BatchObject` on Sui at the point of manufacture. The object carries drug name, composition, expiry, quantity, and a SHA-256 integrity hash. |
| **Custody chain** | Every handoff (manufacturer to distributor to stockist to chemist) creates a frozen, immutable `CustodyRecord` on Sui. Anyone can audit the full chain of custody for any batch. |
| **Sub-60s recall** | When CDSCO issues a recall, the `mark_recalled` function executes on-chain, and all downstream systems (dashboard, verification endpoints) reflect the recall within seconds. |
| **Public QR verification** | Any person can scan the QR code on a medicine package and verify its authenticity directly against Sui's public RPC — no login, no app account, no intermediary trust required. |
| **Whistleblower incentives** | Patients who report suspicious batches that are confirmed fake earn non-transferable DawaPoints, redeemable exclusively at Jan Aushadhi (government) pharmacies. |
| **Export verification** | Batches destined for export receive an `ExportPassport` NFT containing WHO-GMP certificate references, verifiable by importing country health authorities via LayerZero cross-chain messaging. |

### What DawaTrace is NOT

- **Not a cryptocurrency.** DawaPoints are non-transferable utility credits enforced at the Sui VM level (`has key` only, no `store` ability). They cannot be traded, wrapped, or sent to another address.
- **Not a token sale.** There is no financial instrument, no ICO, no speculative asset. All Sui gas costs are sponsored by the government operator node — end users pay zero gas.
- **Not a replacement for CDSCO.** DawaTrace is a tool for regulators, not a substitute. Human regulators retain authority over recalls, suspensions, and enforcement actions.

## 3. Stakeholders and Workflows

### 3.1 Stakeholder Map

| Stakeholder | Role in DawaTrace | On-chain Actions |
|------------|-------------------|-----------------|
| **CDSCO (Regulator)** | Issues recalls, audits violations, views analytics, lifts chemist suspensions | `mark_recalled`, `invalidate_passport`, view all batch/custody data |
| **Manufacturer** | Mints batches at point of production, uploads GMP certificates | `mint_batch`, `mint_export_passport` |
| **Distributor** | Records custody transfers with GPS waypoints | `record_transfer`, `anchor_hash` |
| **Chemist** | Dispenses medicines to patients, operates offline when needed | `record_transfer` (final mile) |
| **Patient** | Scans QR to verify medicine, reports suspicious batches | `verify_batch` (read-only, public), earns DawaPoints for confirmed reports |

### 3.2 Batch Lifecycle

```
Manufacturer                Distributor              Chemist                 Patient
    |                           |                       |                       |
    |-- mint_batch ------------>|                       |                       |
    |   (BatchObject created)   |                       |                       |
    |                           |-- record_transfer --->|                       |
    |                           |   (CustodyRecord)     |                       |
    |                           |                       |-- dispense ---------->|
    |                           |                       |   (CustodyRecord)     |
    |                           |                       |                       |-- verify_batch (QR scan)
    |                           |                       |                       |   (public read from Sui)
```

### 3.3 Recall Flow (Target: <60 seconds end-to-end)

```
Step 1: CDSCO regulator issues recall via dashboard or API
Step 2: GraphQL mutation calls mark_recalled on Sui smart contract
Step 3: BatchObject.recalled = true (on-chain, permanent)
Step 4: Dashboard reflects recall status in real time
Step 5: Any subsequent QR scan returns RECALLED status
```

## 4. Technical Architecture

### 4.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Sui (Move language) | All supply chain state, access control, public verification |
| **API & Backend** | Next.js 15 (App Router), Apollo GraphQL | JWT-authenticated API, org-role RBAC, SuiClient integration |
| **Frontend** | React 19, Tailwind CSS, Recharts | Regulator dashboard with analytics, batch management, custody timelines |
| **Infrastructure** | Docker, Nginx, Vercel (serverless) | Production deployment, reverse proxy, auto-scaling |
| **Internationalization** | i18next | 11 Indian languages (Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi) + English |

### 4.2 Sui Move Smart Contracts

| Module | Objects | Key Functions |
|--------|---------|--------------|
| `batch.move` | `BatchObject` (key, store) | `mint_batch`, `mark_recalled`, `anchor_hash`, `verify_batch` |
| `custody.move` | `CustodyRecord` (key, frozen) | `record_transfer` — creates immutable, publicly readable records |
| `dawa_points.move` | `DawaPointsLedger` (key only), `RedemptionRecord` (key, frozen) | `award_points`, `top_up`, `redeem_points` |
| `export_passport.move` | `ExportPassport` (key, store) | `mint_export_passport`, `invalidate_passport` |
| `bridge_cap.move` | `BridgeCapability` (key only), `AdminCapability` (key only) | `init` (one-time), `transfer_bridge_cap` |

### 4.3 Access Control Model

All state-mutating operations on Sui require a `BridgeCapability` object, held by the authorized government operator. This capability-based pattern:

- Eliminates address-based allowlists (no hardcoded addresses in contracts)
- Supports key rotation without redeployment (admin transfers capability to new operator)
- Is enforced at the Sui VM level — no capability reference, no write access

### 4.4 Data Flow

```
Browser (React + Apollo Client)
  → Authorization: Bearer <JWT>
    → /api/graphql (Next.js API Route, serverless)
      → Resolvers
        → Sui reads: SuiClient.getObject() / queryEvents() via public RPC
        → Sui writes: Programmable Transaction Blocks (PTBs) signed by operator
```

### 4.5 Serverless Design

- **No mutable server state.** The API layer is stateless — all persistent state lives on Sui.
- **SuiClient is stateless** (HTTP RPC wrapper), safe as a module-level singleton in serverless functions.
- **Apollo Server** is instantiated at module scope, compatible with Vercel serverless and edge functions.

## 5. Deep Tech Features

### 5.1 Sui's Consensus: Narwhal/Bullshark

DawaTrace leverages Sui's DAG-based mempool (Narwhal) and BFT consensus (Bullshark), which provides:

- **Parallel transaction execution** — independent batch operations (e.g., two different manufacturers minting batches) execute in parallel without contention, unlike sequential-block chains.
- **Sub-second finality** — critical for the <60s recall SLA. Sui's object-centric model means a recall on Batch A does not block operations on Batch B.
- **Horizontal throughput scaling** — as more validators join, throughput increases (unlike traditional BFT where more validators slow consensus).

### 5.2 Anomaly Detection Engine

The platform includes a rule-based anomaly detection system (`src/lib/server/anomaly/detector.ts`) that continuously analyzes batch data for:

| Anomaly Type | Detection Rule |
|-------------|---------------|
| `EXPIRED_DISPENSED` | Batch past expiry date but still in ACTIVE or IN_TRANSIT status |
| `QUANTITY_MISMATCH` | Batch with zero or negative quantity (data integrity violation) |
| `RAPID_TRANSFER` | Batch moved to IN_TRANSIT within 1 hour of creation (suspicious velocity) |
| `SUSPENDED_CHEMIST` | Batch currently held by a chemist under suspension review |

These alerts surface in the regulator dashboard and can trigger investigation workflows.

### 5.3 Intelligent Smart Contract Patterns

| Pattern | Implementation | Why It Matters |
|---------|---------------|---------------|
| **Capability-gated access** | `BridgeCapability` required for all writes | No address allowlists; supports key rotation without redeployment |
| **Frozen immutable records** | `CustodyRecord` frozen via `transfer::freeze_object` | Custody history cannot be altered after creation; publicly readable by anyone |
| **VM-enforced non-transferability** | `DawaPointsLedger` has `key` only (no `store`) | Points cannot be transferred, wrapped, or traded — enforced at the VM level, not by application logic |
| **Post-shipment invalidation** | `ExportPassport.invalidated` flag | If a batch is recalled after export, the passport is invalidated and importing authorities are notified |

### 5.4 Non-Crypto Tokenization

- **DawaPoints:** Non-transferable utility credits awarded to whistleblowers who report confirmed counterfeit batches. Redeemable only at Jan Aushadhi (government) pharmacies. The Sui `has key` (without `has store`) pattern makes them provably non-tradeable at the VM level — not just by convention, but by the blockchain's type system.
- **ExportPassport:** An NFT issued per export-destined batch, carrying WHO-GMP certificate references and batch integrity hashes. Designed for cross-chain verification via LayerZero, allowing importing country authorities to verify provenance on their native chain.

## 6. Security and Privacy

### 6.1 Privacy (PDPB 2023 Compliance)

- **No raw Aadhaar on-chain.** Patient identity is represented as `SHA3-256(aadhaarNumber + batchId + timestamp)`. The hash is computed client-side before any network call. The raw Aadhaar number never leaves the patient's device.
- **No PII in custody records.** CustodyRecords contain node IDs (e.g., `DIST-DELHI-002`), not personal names or addresses.
- **Frozen records are public but anonymized.** Anyone can audit the custody chain without accessing sensitive data.

### 6.2 Authentication and Authorization

- **JWT-based authentication** with org-role claims (REGULATOR, MANUFACTURER, DISTRIBUTOR, CHEMIST).
- **Role-based access control** at the GraphQL resolver level — e.g., only REGULATOR role can issue recalls or lift suspensions.
- **Capability-based access control** on Sui — all write operations require the `BridgeCapability` object.

### 6.3 Data Integrity

- **SHA-256 hash anchoring** — each batch carries a `data_hash` field updated at every state change. Any tampering with off-chain data is detectable by comparing against the on-chain hash.
- **Immutable custody records** — frozen on Sui, cannot be modified after creation.
- **Environment validation** — server configuration is validated at startup using zod schemas, preventing misconfiguration.

## 7. Scalability and Performance

| Dimension | Approach |
|-----------|----------|
| **Compute scaling** | Vercel serverless functions — auto-scales with request volume, zero cold-start overhead for edge functions |
| **Blockchain throughput** | Sui's object-centric model enables parallel transaction execution. Independent batch operations do not contend for the same locks. |
| **Stateless API** | No mutable server state. Every API invocation is independent — horizontally scalable by definition. |
| **Read scalability** | Sui public RPC nodes are globally distributed. Batch verification reads can hit any fullnode. |
| **Monitoring** | Prometheus metrics collection + Grafana dashboards for recall SLA tracking, transaction latency, and anomaly rates |

### Performance Targets

| Metric | Target |
|--------|--------|
| Recall propagation (on-chain to UI) | < 60 seconds |
| Batch verification (QR scan to result) | < 2 seconds |
| API response time (p95) | < 500ms |

## 8. Modularity and API Integration

### 8.1 API Surface

- **GraphQL API** (`/api/graphql`) — full query and mutation support for batch management, recalls, analytics, custody chains, chemist violations, and reporting.
- **REST endpoints** — health check (`/api/health`), authentication (`/api/auth/login`).
- **Direct Sui RPC** — batch verification can bypass the API entirely and query Sui's public RPC directly. This is how patient QR scanning works — no DawaTrace backend dependency.

### 8.2 Replicability

The architecture is designed for replication across Indian states:

- **Single deployment per state drug authority** — each state runs its own Next.js instance pointing to the same Sui network.
- **Shared on-chain state** — all states read and write to the same Sui package. A batch minted in Maharashtra is verifiable in Tamil Nadu without cross-state API calls.
- **Capability delegation** — the central `AdminCapability` holder (C-DAC / CDSCO) can issue `BridgeCapability` objects to authorized state operators.
- **Language support** — 11 Indian languages built in, covering ~95% of the population.

## 9. Regulatory Compliance

| Regulation | How DawaTrace Complies |
|-----------|----------------------|
| **PDPB 2023** | No raw Aadhaar stored anywhere. Patient identity = SHA3-256 hash computed client-side. |
| **Drugs and Cosmetics Act, 1940** | Recall workflows mirror CDSCO's regulatory process. Chemist suspension logic enforces violation thresholds. |
| **IT Act, 2000** | JWT authentication, role-based access, capability-gated smart contracts. Audit trail is immutable and publicly verifiable. |
| **WHO GMP standards** | ExportPassport NFT carries GMP certificate references for cross-border verification. |

## 10. Business Model

### 10.1 Revenue Model

DawaTrace is designed as a **government-operated public good**, not a commercial SaaS product.

| Revenue Stream | Description |
|---------------|-------------|
| **C-DAC licensing** | C-DAC deploys and operates the platform for CDSCO. Licensing fees from state drug authorities for dashboard access. |
| **Manufacturer onboarding fees** | Pharmaceutical manufacturers pay a one-time onboarding fee + per-batch minting fee (covers Sui gas, sponsored by govt node). |
| **Jan Aushadhi integration** | DawaPoints redemption at Jan Aushadhi stores drives footfall to government pharmacies, supporting the existing PMBJP scheme. |
| **Export verification fees** | Importing country health authorities pay for ExportPassport verification API access, creating a revenue stream from India's $27B pharma export market. |

### 10.2 Cost Structure

| Cost | Mitigation |
|------|-----------|
| Sui gas fees | Sponsored by government operator node. Sui's gas model is predictable — no auction-based fee spikes. |
| Infrastructure (Vercel/cloud) | Serverless model — pay only for actual usage. No idle server costs. |
| Maintenance | Open-source codebase. C-DAC and state IT departments can maintain independently. |

## 11. Proliferation Strategy

### Phase 1: Pilot (Months 1–6)
- Deploy on Sui devnet/testnet with 2–3 pharmaceutical manufacturers in one state (e.g., Maharashtra or Gujarat — highest pharma manufacturing concentration).
- Integrate with CDSCO's existing recall notification system.
- Onboard 50–100 chemists in pilot districts for QR verification testing.

### Phase 2: State Rollout (Months 6–12)
- Move to Sui mainnet.
- Expand to 5 states with highest counterfeit drug incidence.
- Integrate with state drug controller portals for seamless recall propagation.
- Launch Jan Aushadhi DawaPoints redemption in pilot pharmacies.

### Phase 3: National Scale (Months 12–24)
- All 36 states and UTs onboarded via capability delegation model.
- Manufacturer onboarding mandated for scheduled drugs (starting with Schedule H and H1).
- ExportPassport integration with 5+ importing countries via LayerZero.
- Mobile app launch for chemist offline dispensing and patient QR scanning.

### Phase 4: International (24+ months)
- WHO endorsement for ExportPassport as a standard for pharmaceutical provenance.
- LayerZero bridge live on Ethereum, Polygon, and other chains used by importing country regulators.
- Template replicated for other supply chain verticals (medical devices, vaccines, food safety).

## 12. Government Collaboration

DawaTrace is designed for deployment in partnership with:

| Entity | Role |
|--------|------|
| **C-DAC** | Technical partner — hosts infrastructure, operates Sui validator node, manages capability delegation |
| **CDSCO** | Regulatory authority — issues recalls via dashboard, defines violation thresholds, audits analytics |
| **State Drug Controllers** | State-level operators — onboard local manufacturers and distributors, monitor regional dashboards |
| **Jan Aushadhi (PMBJP)** | DawaPoints redemption partner — government pharmacies where whistleblower credits are redeemed |
| **NIC (National Informatics Centre)** | Integration partner — connects DawaTrace APIs with existing government health IT systems (e.g., Drug Licensing portal) |

---

*DawaTrace — Every medicine batch. Tracked, verified, recalled in under 60 seconds.*
