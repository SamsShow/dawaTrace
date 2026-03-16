import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '../components/ThemeToggle';

// ── Types ──────────────────────────────────────────────────────────────────

interface TocEntry { id: string; label: string; depth: 1 | 2 }
interface DocPage  { slug: string; title: string; toc: TocEntry[]; content: () => JSX.Element }
interface NavGroup { label: string; pages: DocPage[] }

// ── Content ────────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 border border-border">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <div className="my-4 border border-border bg-muted/40">
      <pre className="px-4 py-3.5 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-base font-semibold mt-10 mb-3 scroll-mt-20">{children}</h2>;
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return <h3 id={id} className="text-sm font-semibold mt-6 mb-2 scroll-mt-20">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

function Callout({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'danger'; children: React.ReactNode }) {
  const styles = {
    info:   'border-border bg-muted/30',
    warn:   'border-amber-300/50 bg-amber-50/60',
    danger: 'border-destructive/30 bg-destructive/5',
  };
  const labels = { info: 'Note', warn: 'Warning', danger: 'Important' };
  const labelColor = { info: 'text-foreground', warn: 'text-amber-700', danger: 'text-destructive' };
  return (
    <div className={cn('border px-4 py-3 my-4', styles[kind])}>
      <p className={cn('text-[11px] font-semibold uppercase tracking-wide mb-1', labelColor[kind])}>{labels[kind]}</p>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 border border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={cn('px-3 py-2', j === 0 ? 'font-mono font-medium' : 'text-muted-foreground')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

const PAGES: NavGroup[] = [
  {
    label: 'Introduction',
    pages: [
      {
        slug: 'overview',
        title: 'What is DawaTrace',
        toc: [
          { id: 'what', label: 'Overview', depth: 1 },
          { id: 'why-hybrid', label: 'Why hybrid blockchain', depth: 1 },
          { id: 'stakeholders', label: 'Stakeholders', depth: 1 },
          { id: 'sla', label: 'Recall SLA', depth: 2 },
        ],
        content: () => (
          <>
            <H2 id="what">Overview</H2>
            <P>DawaTrace is a hybrid blockchain platform for India's pharmaceutical supply chain, built for the CDAC Blockchain India Challenge 2026. Every batch of medicine — from manufacturer to distributor to chemist to patient — is tracked on <Code>Hyperledger Fabric</Code> and publicly verifiable on <Code>Sui</Code>.</P>
            <P>The system enforces a sub-60-second recall SLA: the moment CDSCO issues a recall on the permissioned Fabric network, a bridge relay anchors the state change to Sui so any patient or export partner can verify it without a login.</P>

            <H2 id="why-hybrid">Why hybrid blockchain</H2>
            <P>A purely public chain (e.g. Ethereum) exposes commercially sensitive batch data. A purely private chain (e.g. Fabric alone) makes it impossible for patients to verify medicine authenticity without trusting a central API.</P>
            <P>DawaTrace solves this with a two-layer design:</P>
            <Table
              headers={['Layer', 'Chain', 'Who can read', 'Who can write']}
              rows={[
                ['Regulatory core', 'Hyperledger Fabric', 'Enrolled orgs only', 'Authorised org peers'],
                ['Public verification', 'Sui', 'Anyone', 'C-DAC bridge relay only'],
              ]}
            />
            <P>Only cryptographic hashes and recall flags are published to Sui — raw batch data stays on Fabric.</P>

            <H2 id="stakeholders">Stakeholders</H2>
            <Table
              headers={['Org ID', 'Role', 'Fabric MSP', 'Primary actions']}
              rows={[
                ['CDSCO-REG-*', 'Regulator', 'RegulatorOrgMSP', 'issueRecall, flagChemist, view analytics'],
                ['MFG-*', 'Manufacturer', 'MfgOrgMSP', 'mintBatch'],
                ['DIST-*', 'Distributor', 'DistributorOrgMSP', 'transferBatch'],
                ['CHEM-*', 'Chemist', 'ChemistOrgMSP', 'dispenseMedicine (offline-capable)'],
                ['—', 'Patient', 'n/a (Sui only)', 'verifyBatch, report suspicious batch'],
              ]}
            />

            <H3 id="sla">Recall SLA</H3>
            <P>The <Code>&lt;60s</Code> SLA is measured from Fabric block commit to Sui object update:</P>
            <Pre>{`Fabric issueRecall tx committed
  → bridge listener receives RecallEvent       (~1s)
  → URGENT queue lane picked up                (~2s)
  → Sui mark_recalled PTB submitted            (~5s)
  → BatchObject.recalled = true on-chain       (~10s)
───────────────────────────────────────────────
Total: typically 10–15s, hard limit 60s`}</Pre>
            <Callout kind="warn">If the bridge dead-letter queue grows (visible in the Grafana dashboard), on-call should page immediately — it means recalls are not anchoring within SLA.</Callout>
          </>
        ),
      },
    ],
  },
  {
    label: 'Architecture',
    pages: [
      {
        slug: 'fabric',
        title: 'Hyperledger Fabric',
        toc: [
          { id: 'chaincode', label: 'Chaincode', depth: 1 },
          { id: 'functions', label: 'Contract functions', depth: 2 },
          { id: 'events', label: 'Events', depth: 2 },
          { id: 'network', label: 'Network topology', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="chaincode">Chaincode</H2>
            <P>The Go chaincode lives in <Code>fabric/chaincode/dawaTrace/</Code> and is deployed to the <Code>dawaTrace-channel</Code> channel. The package name is <Code>dawaTrace</Code> and the Go module is <Code>github.com/dawaTrace/chaincode</Code>.</P>
            <H3 id="functions">Contract functions</H3>
            <Table
              headers={['Function', 'Caller', 'Description']}
              rows={[
                ['MintBatch', 'MANUFACTURER', 'Creates a new Batch asset on the ledger'],
                ['TransferBatch', 'MFG, DISTRIBUTOR', 'Changes currentCustodian, appends TransferRecord'],
                ['DispenseMedicine', 'CHEMIST', 'Logs dispense; stores patientHash (never raw Aadhaar)'],
                ['IssueRecall', 'REGULATOR', 'Marks batch RECALLED, emits RecallEvent for bridge'],
                ['FlagChemist', 'REGULATOR', 'Increments violation counter; suspends at threshold 3'],
                ['UpdateSuiObjectID', 'BRIDGE', 'Writes Sui object ID back after mint anchor'],
              ]}
            />
            <H3 id="events">Events</H3>
            <P>The bridge relay keys on three event names. <strong>Do not rename them</strong> without updating <Code>bridge/src/listener.ts</Code>.</P>
            <Pre>{`const EventMintBatch     = "MintEvent"
const EventTransferBatch = "TransferEvent"
const EventIssueRecall   = "RecallEvent"   // triggers URGENT queue`}</Pre>

            <H2 id="network">Network topology</H2>
            <P>Four organisations, one orderer, one channel:</P>
            <Pre>{`Orderer:   orderer.dawaTrace.com:7050
MfgOrg:   peer0.mfg.dawaTrace.com:7051
DistOrg:  peer0.distributor.dawaTrace.com:8051
ChemOrg:  peer0.chemist.dawaTrace.com:9051
RegOrg:   peer0.regulator.dawaTrace.com:10051`}</Pre>
            <P>Connection profiles for each org live in <Code>fabric/connection-profiles/</Code>.</P>
            <Callout>All orgs use ECDSA P-256 keys. RSA is not supported by the Fabric Gateway SDK used here.</Callout>
          </>
        ),
      },
      {
        slug: 'sui',
        title: 'Sui Smart Contracts',
        toc: [
          { id: 'modules', label: 'Modules', depth: 1 },
          { id: 'batch-object', label: 'BatchObject', depth: 2 },
          { id: 'dawa-points', label: 'DawaPoints', depth: 2 },
          { id: 'bridge-cap', label: 'BridgeCapability', depth: 2 },
          { id: 'verify', label: 'Public verification', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="modules">Modules</H2>
            <Table
              headers={['Module', 'File', 'Description']}
              rows={[
                ['dawa_trace::batch', 'batch.move', 'BatchObject, anchor_hash, mark_recalled, verify_batch'],
                ['dawa_trace::custody', 'custody.move', 'CustodyRecord (frozen), transfer_custody'],
                ['dawa_trace::dawa_points', 'dawa_points.move', 'Non-transferable loyalty points'],
                ['dawa_trace::export_passport', 'export_passport.move', 'Export NFT with LayerZero hook'],
                ['dawa_trace::bridge_cap', 'bridge_cap.move', 'BridgeCapability + AdminCapability init'],
              ]}
            />
            <H3 id="batch-object">BatchObject</H3>
            <P><Code>BatchObject</Code> has abilities <Code>key, store</Code>. It is created by the bridge relay via <Code>BridgeCapability</Code> and is never transferable by end users.</P>
            <Pre>{`public struct BatchObject has key, store {
    id: UID,
    batch_id: String,
    data_hash: vector<u8>,   // SHA-256 of Fabric state
    recalled: bool,
    custody_chain: vector<CustodyRecord>,
}`}</Pre>

            <H3 id="dawa-points">DawaPoints</H3>
            <P>Points are <Code>key</Code> only (no <Code>store</Code>), making them non-transferable at the Move VM level. They live in the holder's address and cannot be moved to another object.</P>
            <Callout kind="warn">Never add <Code>store</Code> ability to DawaPoints — it would make them transferable, breaking the incentive model.</Callout>

            <H3 id="bridge-cap">BridgeCapability</H3>
            <P>The bridge relay holds a <Code>BridgeCapability</Code> object. If the relay keypair is compromised, the <Code>AdminCapability</Code> holder (C-DAC) can rotate the capability to a new address without redeploying contracts.</P>
            <Pre>{`public fun rotate_bridge(
    admin: &AdminCapability,
    cap: BridgeCapability,
    new_relay: address,
    ctx: &mut TxContext,
)`}</Pre>

            <H2 id="verify">Public verification</H2>
            <P>Anyone can call <Code>verify_batch</Code> against the public Sui RPC — no API key, no DawaTrace account:</P>
            <Pre>{`sui client call \\
  --package $PACKAGE_ID \\
  --module batch \\
  --function verify_batch \\
  --args $BATCH_OBJECT_ID`}</Pre>
            <P>This returns <Code>recalled: bool</Code>, <Code>data_hash</Code>, and the full <Code>custody_chain</Code>. The mobile patient app uses this endpoint directly, bypassing the API layer entirely.</P>
          </>
        ),
      },
      {
        slug: 'bridge',
        title: 'Bridge Relay',
        toc: [
          { id: 'flow', label: 'Event flow', depth: 1 },
          { id: 'queue', label: 'Priority queue', depth: 1 },
          { id: 'retry', label: 'Retry & dead letter', depth: 2 },
          { id: 'health', label: 'Health endpoint', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="flow">Event flow</H2>
            <P>The bridge (<Code>bridge/src/</Code>) subscribes to all events on <Code>dawaTrace-channel</Code> via the Fabric Gateway SDK and translates them into Sui PTB transactions.</P>
            <Pre>{`Fabric event → listener.ts
  → determines priority (URGENT if RecallEvent)
  → relay.ts builds PTB via sui/transactions.ts
  → signed by C-DAC Ed25519 keypair (signer.ts)
  → submitted to Sui RPC`}</Pre>

            <H2 id="queue">Priority queue</H2>
            <P>The queue (<Code>bridge/src/queue.ts</Code>) uses a Redis sorted set scored by <Code>priority * 1e13 + timestamp</Code>. URGENT items (score 2×) always drain before NORMAL (score 1×).</P>
            <Table
              headers={['Event', 'Priority', 'Target latency']}
              rows={[
                ['RecallEvent', 'URGENT (2)', '< 60s end-to-end'],
                ['MintEvent', 'NORMAL (1)', 'best effort'],
                ['TransferEvent', 'NORMAL (1)', 'best effort'],
              ]}
            />

            <H3 id="retry">Retry & dead letter</H3>
            <P>Failed Sui submissions are retried with exponential backoff: <Code>1s → 2s → 4s → 8s → 16s</Code> (5 attempts). After 5 failures the item is written to <Code>dead_letters.jsonl</Code> and a Prometheus counter increments. <strong>A non-zero dead letter count means a recall may not have anchored.</strong></P>
            <Callout kind="danger">Monitor <Code>bridge_dead_letter_total</Code> in Grafana. Page on any value &gt; 0.</Callout>

            <H2 id="health">Health endpoint</H2>
            <P>The bridge exposes <Code>GET /health</Code> on port <Code>4001</Code>. It checks Fabric connectivity, Sui RPC reachability, and Redis ping.</P>
            <Pre>{`{
  "status": "ok",
  "fabric": "connected",
  "sui": "reachable",
  "redis": "ok",
  "queue": { "urgent": 0, "normal": 3 }
}`}</Pre>
          </>
        ),
      },
    ],
  },
  {
    label: 'Getting Started',
    pages: [
      {
        slug: 'prerequisites',
        title: 'Prerequisites',
        toc: [
          { id: 'tools', label: 'Required tools', depth: 1 },
          { id: 'env', label: 'Environment variables', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="tools">Required tools</H2>
            <Table
              headers={['Tool', 'Version', 'Purpose']}
              rows={[
                ['Go', '1.22+', 'Fabric chaincode'],
                ['Sui CLI', 'latest', 'Move contracts & devnet'],
                ['Docker + Compose', '24+', 'Local Fabric network'],
                ['Node.js', '20+', 'API, bridge, web'],
                ['pnpm', '9+', 'Monorepo package manager'],
                ['Redis', '7+', 'Bridge retry queue'],
              ]}
            />
            <H2 id="env">Environment variables</H2>
            <P>Copy <Code>.env.example</Code> to <Code>.env</Code> and fill in the values. Critical variables:</P>
            <Table
              headers={['Variable', 'Example', 'Description']}
              rows={[
                ['FABRIC_GATEWAY_ENDPOINT', 'grpc://localhost:7051', 'Fabric peer gRPC address'],
                ['SUI_RPC_URL', 'https://fullnode.devnet.sui.io', 'Sui RPC endpoint'],
                ['BRIDGE_SUI_PRIVATE_KEY', '0xabc...', 'Ed25519 hex key for C-DAC relay signer'],
                ['BRIDGE_CAPABILITY_ID', '0x123...', 'Sui object ID of BridgeCapability'],
                ['BRIDGE_PACKAGE_ID', '0x456...', 'Published Sui package ID'],
                ['API_JWT_SECRET', 'random-256-bit', 'JWT signing secret'],
                ['REDIS_URL', 'redis://localhost:6379', 'Bridge queue backend'],
              ]}
            />
            <Callout kind="danger">Never commit <Code>BRIDGE_SUI_PRIVATE_KEY</Code> or <Code>API_JWT_SECRET</Code> to git. Use environment secrets in CI/CD.</Callout>
          </>
        ),
      },
      {
        slug: 'local-setup',
        title: 'Local Setup',
        toc: [
          { id: 'fabric-up', label: 'Start Fabric network', depth: 1 },
          { id: 'sui-deploy', label: 'Deploy Sui contracts', depth: 1 },
          { id: 'dev', label: 'Run dev servers', depth: 1 },
          { id: 'test', label: 'Run tests', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="fabric-up">Start Fabric network</H2>
            <Pre>{`# Start 4-org local network (Docker)
make fabric-up

# Deploy dawaTrace chaincode
make deploy-cc

# Verify chaincode is running
make invoke`}</Pre>
            <Callout>First run takes ~3 minutes to pull Docker images. Subsequent starts are ~30s.</Callout>

            <H2 id="sui-deploy">Deploy Sui contracts</H2>
            <Pre>{`# Publish to Sui devnet
make sui-deploy

# The output will print PACKAGE_ID and BRIDGE_CAPABILITY_ID
# → copy these into .env`}</Pre>

            <H2 id="dev">Run dev servers</H2>
            <Pre>{`# API gateway + bridge relay (watches for changes)
pnpm dev --filter @dawaTrace/api --filter @dawaTrace/bridge

# Web dashboard (Vite HMR)
pnpm dev --filter @dawaTrace/web

# Open http://localhost:5173 — sign in as CDSCO-REG-001 / any password`}</Pre>

            <H2 id="test">Run tests</H2>
            <Pre>{`# Go chaincode unit tests
cd fabric/chaincode/dawaTrace && go test ./... -v

# Sui Move tests
cd sui && sui move test

# TypeScript tests (API + bridge)
pnpm test

# End-to-end recall SLA drill (requires full stack running)
make recall-drill`}</Pre>
          </>
        ),
      },
    ],
  },
  {
    label: 'API Reference',
    pages: [
      {
        slug: 'auth',
        title: 'Authentication',
        toc: [
          { id: 'jwt', label: 'JWT tokens', depth: 1 },
          { id: 'roles', label: 'Org roles', depth: 1 },
          { id: 'rate-limits', label: 'Rate limits', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="jwt">JWT tokens</H2>
            <P>All API endpoints (except <Code>GET /health</Code> and <Code>GET /verify/:batchId</Code>) require a Bearer token in the <Code>Authorization</Code> header.</P>
            <Pre>{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}</Pre>
            <P>Token payload:</P>
            <Pre>{`{
  "nodeId": "CDSCO-REG-001",
  "orgRole": "REGULATOR",
  "mspId": "RegulatorOrgMSP",
  "iat": 1710000000,
  "exp": 1710086400
}`}</Pre>

            <H2 id="roles">Org roles</H2>
            <Table
              headers={['Role', 'Permitted actions']}
              rows={[
                ['MANUFACTURER', 'POST /batches'],
                ['DISTRIBUTOR', 'POST /batches/:id/transfer'],
                ['CHEMIST', 'POST /batches/:id/dispense'],
                ['REGULATOR', 'POST /recalls, POST /batches/:id/flag-chemist'],
                ['BRIDGE', 'Internal only — Fabric event relay'],
              ]}
            />

            <H2 id="rate-limits">Rate limits</H2>
            <Table
              headers={['Endpoint group', 'Limit', 'Window']}
              rows={[
                ['All API endpoints', '120 requests', '1 minute per IP'],
                ['POST /auth/login', '10 requests', '15 minutes per IP'],
                ['GET /verify/:batchId', '300 requests', '1 minute per IP'],
              ]}
            />
            <P>Rate limit headers are returned on every response: <Code>X-RateLimit-Limit</Code>, <Code>X-RateLimit-Remaining</Code>, <Code>X-RateLimit-Reset</Code>.</P>
          </>
        ),
      },
      {
        slug: 'graphql',
        title: 'GraphQL Schema',
        toc: [
          { id: 'queries', label: 'Queries', depth: 1 },
          { id: 'mutations', label: 'Mutations', depth: 1 },
          { id: 'types', label: 'Types', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="queries">Queries</H2>
            <Pre>{`type Query {
  batch(batchId: String!): Batch
  batches: [Batch!]!
  recall(batchId: String!): RecallRecord
  recalls: [RecallRecord!]!
  verifyBatch(suiObjectId: String!): VerificationResult
  anomalies(limit: Int): [Anomaly!]!
}`}</Pre>

            <H2 id="mutations">Mutations</H2>
            <Pre>{`type Mutation {
  mintBatch(
    batchId: String!
    drugName: String!
    composition: String!
    expiryDate: String!
    quantity: Int!
    details: String
  ): MutationResult!

  transferBatch(
    batchId: String!
    toNode: String!
    quantity: Int!
    gpsLocation: String
  ): MutationResult!

  issueRecall(
    batchId: String!
    reason: String!
  ): MutationResult!
}`}</Pre>

            <H2 id="types">Types</H2>
            <Pre>{`type Batch {
  batchId: String!
  drugName: String!
  composition: String!
  expiryDate: String!
  quantity: Int!
  manufacturerId: String!
  currentCustodian: String!
  status: BatchStatus!
  suiObjectId: String!
  dataHash: String!
  createdAt: Float!
  updatedAt: Float!
}

enum BatchStatus {
  ACTIVE
  IN_TRANSIT
  DISPENSED
  RECALLED
  SUSPENDED_REVIEW
}`}</Pre>
          </>
        ),
      },
    ],
  },
  {
    label: 'Mobile App',
    pages: [
      {
        slug: 'offline',
        title: 'Offline Mode',
        toc: [
          { id: 'how', label: 'How it works', depth: 1 },
          { id: 'sqlite', label: 'SQLite schema', depth: 2 },
          { id: 'sync', label: 'Sync on reconnect', depth: 2 },
          { id: 'limits', label: 'Limitations', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="how">How it works</H2>
            <P>When a chemist dispenses medicine without internet connectivity, the dispense record is written to a local SQLite database instead of being submitted to the API. A background hook polls network status every 10 seconds and flushes the queue when connectivity returns.</P>
            <H3 id="sqlite">SQLite schema</H3>
            <Pre>{`-- Offline batch cache (prefetched when online)
CREATE TABLE batch_cache (
  batch_id   TEXT PRIMARY KEY,
  data       TEXT NOT NULL,  -- JSON
  cached_at  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL  -- cached_at + 24h
);

-- Pending dispense queue
CREATE TABLE dispense_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id    TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  patient_hash TEXT NOT NULL,  -- SHA3-256, never raw Aadhaar
  created_at  INTEGER NOT NULL,
  attempts    INTEGER DEFAULT 0,
  synced      INTEGER DEFAULT 0
);`}</Pre>

            <H3 id="sync">Sync on reconnect</H3>
            <P><Code>useOfflineSync</Code> flushes the queue in FIFO order when <Code>expo-network</Code> reports internet reachability. Each record is submitted to <Code>POST /batches/:id/dispense</Code>. Successful submissions are marked <Code>synced = 1</Code>.</P>
            <Callout kind="warn">Batch cache entries expire after 24 hours. If a chemist is offline for more than 24 hours, they must reconnect to refresh the cache before dispensing.</Callout>

            <H2 id="limits">Limitations</H2>
            <P>Recall checks are not available fully offline. <Code>verifyBatch</Code> reads directly from Sui RPC — if the device has no connectivity at all, the patient app cannot confirm a batch's status. The app shows a clear "offline — cannot verify" message in this case.</P>
          </>
        ),
      },
      {
        slug: 'zklogin',
        title: 'zkLogin (Aadhaar)',
        toc: [
          { id: 'flow', label: 'Auth flow', depth: 1 },
          { id: 'privacy', label: 'Privacy', depth: 1 },
          { id: 'gas', label: 'Gas sponsorship', depth: 1 },
        ],
        content: () => (
          <>
            <H2 id="flow">Auth flow</H2>
            <P>Chemists and patients authenticate using Sui zkLogin with an OIDC provider (Google OAuth as placeholder; production target is UIDAI Aadhaar OIDC). This gives them a persistent Sui address without holding private keys.</P>
            <Pre>{`Phase 1 — Generate ephemeral keypair + nonce
Phase 2 — OIDC login (Google/Aadhaar)
Phase 3 — Fetch JWT from OIDC callback
Phase 4 — Generate zkProof (Mysten prover)
Phase 5 — Derive Sui address, store in SecureStore`}</Pre>

            <H2 id="privacy">Privacy</H2>
            <P>Raw Aadhaar numbers are <strong>never stored on-chain or sent to the API</strong>. The mobile app computes a client-side hash before any network call:</P>
            <Pre>{`patientHash = SHA3-256(aadhaarNumber + batchId + timestamp)`}</Pre>
            <P>This is PDPB (Personal Data Protection Bill) compliant. Even if the Fabric ledger were leaked, no Aadhaar numbers could be recovered.</P>

            <H2 id="gas">Gas sponsorship</H2>
            <P>All Sui transactions for chemists and patients are sponsored by the government (C-DAC) node. Users hold zero SUI tokens. The sponsorship account is funded separately and monitored via the Grafana dashboard.</P>
            <Callout>If the gas sponsor account runs low, <Code>DawaPoints</Code> redemptions will fail before <Code>verifyBatch</Code> calls (verify is a read-only eval, gas-free).</Callout>
          </>
        ),
      },
    ],
  },
];

// ── Flat page index ────────────────────────────────────────────────────────

const ALL_PAGES = PAGES.flatMap(g => g.pages);

function findPage(slug: string) {
  return ALL_PAGES.find(p => p.slug === slug) ?? ALL_PAGES[0];
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ current, onSelect }: { current: string; onSelect: (slug: string) => void }) {
  return (
    <nav className="space-y-5">
      {PAGES.map(group => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-2">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.pages.map(page => (
              <li key={page.slug}>
                <button
                  onClick={() => onSelect(page.slug)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors',
                    current === page.slug
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  {page.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ── TOC ────────────────────────────────────────────────────────────────────

function TableOfContents({ toc, activeId }: { toc: TocEntry[]; activeId: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        On this page
      </p>
      <ul className="space-y-1">
        {toc.map(entry => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={cn(
                'block text-xs transition-colors py-0.5',
                entry.depth === 2 ? 'pl-3' : '',
                activeId === entry.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Docs() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const page = findPage(slug ?? 'overview');
  const [activeId, setActiveId] = useState(page.toc[0]?.id ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update active TOC entry on scroll
  useEffect(() => {
    const handler = () => {
      for (const entry of [...page.toc].reverse()) {
        const el = document.getElementById(entry.id);
        if (el && el.getBoundingClientRect().top <= 88) {
          setActiveId(entry.id);
          return;
        }
      }
      if (page.toc[0]) setActiveId(page.toc[0].id);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [page]);

  // Scroll to top when page changes
  useEffect(() => { window.scrollTo(0, 0); setActiveId(page.toc[0]?.id ?? ''); }, [page.slug]);

  const handleSelect = (s: string) => {
    navigate(`/docs/${s}`);
    setMobileOpen(false);
  };

  // Prev / next
  const idx = ALL_PAGES.indexOf(page);
  const prev = ALL_PAGES[idx - 1];
  const next = ALL_PAGES[idx + 1];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Top nav ── */}
      <header className="border-b border-border sticky top-0 bg-background z-20">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-semibold tracking-tight shrink-0">DawaTrace</Link>
            <span className="text-border">|</span>
            <span className="text-xs text-muted-foreground hidden sm:block">Documentation</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Dashboard
            </Link>
            <ThemeToggle />
            <button
              className="sm:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile sidebar drawer ── */}
      {mobileOpen && (
        <div className="sm:hidden border-b border-border bg-background px-4 py-4 sticky top-12 z-10">
          <Sidebar current={page.slug} onSelect={handleSelect} />
        </div>
      )}

      <div className="max-w-6xl mx-auto flex">

        {/* ── Desktop left sidebar ── */}
        <aside className="hidden sm:block w-52 shrink-0 border-r border-border sticky top-12 self-start h-[calc(100vh-48px)] overflow-y-auto py-6 px-4">
          <Sidebar current={page.slug} onSelect={handleSelect} />
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 px-6 md:px-10 py-8" ref={contentRef}>
          <div className="max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-6">
              {PAGES.map(g => g.pages.find(p => p.slug === page.slug) ? (
                <span key={g.label} className="flex items-center gap-1.5">
                  <span>{g.label}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground">{page.title}</span>
                </span>
              ) : null)}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight mb-2">{page.title}</h1>
            <div className="border-b border-border mb-8" />

            {/* Content */}
            <page.content />

            {/* Prev / Next */}
            <div className="border-t border-border mt-12 pt-6 flex justify-between gap-4">
              {prev ? (
                <button
                  onClick={() => handleSelect(prev.slug)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  <span>{prev.title}</span>
                </button>
              ) : <div />}
              {next ? (
                <button
                  onClick={() => handleSelect(next.slug)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <span>{next.title}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </main>

        {/* ── Right TOC ── */}
        <aside className="hidden lg:block w-48 shrink-0 sticky top-12 self-start h-[calc(100vh-48px)] overflow-y-auto py-8 px-4">
          <TableOfContents toc={page.toc} activeId={activeId} />
        </aside>

      </div>
    </div>
  );
}
