'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { Code, Pre, H2, H3, P, Callout, Table } from '@/components/docs/primitives';

const TOC = [
  { id: 'problem', label: 'Problem Statement' },
  { id: 'solution', label: 'Solution Overview' },
  { id: 'stakeholders', label: 'Stakeholders & Workflows' },
  { id: 'architecture', label: 'Technical Architecture' },
  { id: 'deep-tech', label: 'Deep Tech Features' },
  { id: 'security', label: 'Security & Privacy' },
  { id: 'scalability', label: 'Scalability & Performance' },
  { id: 'compliance', label: 'Regulatory Compliance' },
  { id: 'business-model', label: 'Business Model' },
  { id: 'proliferation', label: 'Proliferation Strategy' },
  { id: 'govt-collaboration', label: 'Government Collaboration' },
];

function SidebarTOC({ activeId }: { activeId: string }) {
  return (
    <nav className="hidden lg:block sticky top-16 w-52 shrink-0 py-8 pr-6">
      <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-4">On this page</p>
      <ul className="space-y-1.5">
        {TOC.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-xs py-0.5 transition-colors ${activeId === item.id ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function About() {
  const [activeId, setActiveId] = useState('problem');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    for (const item of TOC) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">DawaTrace</Link>
          <nav className="flex items-center gap-4">
            <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Developer Docs</Link>
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 flex gap-0">
        <SidebarTOC activeId={activeId} />

        <main className="flex-1 max-w-3xl py-12 lg:pl-6 lg:border-l lg:border-border">
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-3">CDAC Blockchain India Challenge 2026</p>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">DawaTrace</h1>
          <p className="text-sm text-muted-foreground mb-10">Blockchain pharmaceutical supply chain platform built on Sui</p>

          {/* ================================================================
              1. PROBLEM STATEMENT
              ================================================================ */}
          <H2 id="problem">Problem Statement</H2>
          <P>
            India is the world&apos;s largest provider of generic medicines, supplying over 50% of global vaccine demand and 40% of
            generic drug demand in the US. Yet the domestic pharmaceutical supply chain remains vulnerable to counterfeit drugs,
            opaque custody chains, and dangerously slow recall response times.
          </P>

          <Table headers={['Challenge', 'Impact']} rows={[
            ['Counterfeit drugs', 'WHO estimates 10–30% of medicines in developing countries are substandard or falsified. CDSCO regularly identifies spurious batches across Indian states, but enforcement is fragmented across 36 state drug authorities.'],
            ['Slow recall propagation', 'When CDSCO identifies a dangerous batch, the current recall process relies on manual notifications through state drug controllers, wholesalers, and retail chemists. This can take days or weeks — during which patients continue consuming recalled medicines.'],
            ['No public verification', 'A patient at a pharmacy counter has no way to independently verify whether a medicine batch is authentic, recalled, or expired. They must trust every intermediary in the chain.'],
            ['Privacy risks', 'Any digital tracking system handling patient identity must comply with PDPB 2023, which mandates that sensitive identifiers like Aadhaar numbers must not be stored in plaintext by third parties.'],
          ]} />

          {/* ================================================================
              2. SOLUTION OVERVIEW
              ================================================================ */}
          <H2 id="solution">Solution Overview</H2>
          <P>
            DawaTrace is a blockchain-based pharmaceutical supply chain platform built on Sui that provides end-to-end tracking
            of medicine batches from manufacturer to patient, with a target recall propagation time of under 60 seconds.
          </P>

          <Table headers={['Capability', 'Description']} rows={[
            ['Batch lifecycle tracking', 'Every medicine batch is minted as a BatchObject on Sui at the point of manufacture, carrying drug name, composition, expiry, quantity, and a SHA-256 integrity hash.'],
            ['Immutable custody chain', 'Every handoff (manufacturer → distributor → stockist → chemist) creates a frozen, immutable CustodyRecord on Sui. Anyone can audit the full chain of custody for any batch.'],
            ['Sub-60s recall propagation', 'When CDSCO issues a recall, mark_recalled executes on-chain and all downstream systems (dashboard, QR verification) reflect the recall within seconds.'],
            ['Public QR verification', 'Any person can scan the QR code on a medicine package and verify its authenticity directly against Sui\'s public RPC — no login, no app account, no intermediary trust required.'],
            ['Whistleblower incentives', 'Patients who report suspicious batches that are confirmed fake earn non-transferable DawaPoints, redeemable exclusively at Jan Aushadhi (government) pharmacies.'],
            ['Export verification', 'Batches destined for export receive an ExportPassport NFT containing WHO-GMP certificate references, verifiable by importing country health authorities via LayerZero cross-chain messaging.'],
          ]} />

          <Callout kind="danger">
            <strong>DawaTrace is NOT a cryptocurrency.</strong> DawaPoints are non-transferable utility credits enforced at the Sui VM level.
            They cannot be traded, wrapped, or sent to another address. There is no token sale, no ICO, no speculative asset.
            All Sui gas costs are sponsored by the government operator node — end users pay zero gas.
          </Callout>

          {/* ================================================================
              3. STAKEHOLDERS & WORKFLOWS
              ================================================================ */}
          <H2 id="stakeholders">Stakeholders & Workflows</H2>

          <H3 id="stakeholder-map">Stakeholder map</H3>
          <Table headers={['Stakeholder', 'Role', 'On-chain Actions']} rows={[
            ['CDSCO (Regulator)', 'Issues recalls, audits violations, views analytics, lifts chemist suspensions', 'mark_recalled, invalidate_passport, view all batch/custody data'],
            ['Manufacturer', 'Mints batches at point of production, uploads GMP certificates', 'mint_batch, mint_export_passport'],
            ['Distributor', 'Records custody transfers with GPS waypoints', 'record_transfer, anchor_hash'],
            ['Chemist', 'Dispenses medicines to patients', 'record_transfer (final mile)'],
            ['Patient', 'Scans QR to verify medicine, reports suspicious batches', 'verify_batch (read-only, public), earns DawaPoints for confirmed reports'],
          ]} />

          <H3 id="batch-lifecycle">Batch lifecycle</H3>
          <Pre>{`Manufacturer                Distributor              Chemist                 Patient
    |                           |                       |                       |
    |-- mint_batch ------------>|                       |                       |
    |   (BatchObject created)   |                       |                       |
    |                           |-- record_transfer --->|                       |
    |                           |   (CustodyRecord)     |                       |
    |                           |                       |-- dispense ---------->|
    |                           |                       |   (CustodyRecord)     |
    |                           |                       |                       |-- verify_batch
    |                           |                       |                       |   (public read)`}</Pre>

          <H3 id="recall-flow">Recall flow (target: &lt;60 seconds)</H3>
          <div className="my-4 border border-border divide-y divide-border">
            {[
              { step: '01', actor: 'CDSCO Regulator', action: 'Issues recall via dashboard or GraphQL API' },
              { step: '02', actor: 'Sui smart contract', action: 'mark_recalled sets BatchObject.recalled = true on-chain' },
              { step: '03', actor: 'Dashboard', action: 'Apollo Client polls GraphQL, reflects recall status in real time' },
              { step: '04', actor: 'QR verification', action: 'Any subsequent scan returns RECALLED status directly from Sui RPC' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-5 px-5 py-3">
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-6 pt-0.5">{s.step}</span>
                <div>
                  <p className="text-xs font-medium">{s.actor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.action}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ================================================================
              4. TECHNICAL ARCHITECTURE
              ================================================================ */}
          <H2 id="architecture">Technical Architecture</H2>

          <H3 id="stack">Technology stack</H3>
          <Table headers={['Layer', 'Technology', 'Purpose']} rows={[
            ['Blockchain', 'Sui (Move language)', 'All supply chain state, access control, public verification'],
            ['API & Backend', 'Next.js 15 (App Router), Apollo GraphQL', 'JWT-authenticated API, org-role RBAC, SuiClient integration'],
            ['Frontend', 'React 19, Tailwind CSS, Recharts', 'Regulator dashboard with analytics, batch management, custody timelines'],
            ['Infrastructure', 'Docker, Nginx, Vercel (serverless)', 'Production deployment, reverse proxy, auto-scaling'],
            ['Internationalization', 'i18next', '11 Indian languages: Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi + English'],
          ]} />

          <H3 id="move-contracts">Sui Move smart contracts</H3>
          <Table headers={['Module', 'Objects', 'Key Functions']} rows={[
            ['dawa_trace::batch', 'BatchObject (key, store)', 'mint_batch, mark_recalled, anchor_hash, verify_batch'],
            ['dawa_trace::custody', 'CustodyRecord (key, frozen)', 'record_transfer — creates immutable, publicly readable records'],
            ['dawa_trace::dawa_points', 'DawaPointsLedger (key only), RedemptionRecord (key, frozen)', 'award_points, top_up, redeem_points'],
            ['dawa_trace::export_passport', 'ExportPassport (key, store)', 'mint_export_passport, invalidate_passport'],
            ['dawa_trace::bridge_cap', 'BridgeCapability (key only), AdminCapability (key only)', 'init (one-time), transfer_bridge_cap'],
          ]} />

          <H3 id="access-control">Capability-based access control</H3>
          <P>
            All state-mutating operations on Sui require a <Code>BridgeCapability</Code> object, held by the authorized government operator.
            This eliminates address-based allowlists, supports key rotation without contract redeployment, and is enforced at
            the Sui VM level — no capability reference means no write access.
          </P>

          <H3 id="data-flow">Data flow</H3>
          <Pre>{`Browser (React + Apollo Client)
  → Authorization: Bearer <JWT>
    → /api/graphql (Next.js API Route, serverless)
      → Resolvers
        → Sui reads: SuiClient.getObject() / queryEvents()
        → Sui writes: Programmable Transaction Blocks (PTBs)`}</Pre>

          <H3 id="serverless">Serverless design</H3>
          <P>
            The API layer is fully stateless — all persistent state lives on Sui. SuiClient is a stateless HTTP RPC wrapper,
            safe as a module-level singleton. Apollo Server is instantiated at module scope, compatible with Vercel serverless
            functions. No mutable server state exists between invocations.
          </P>

          {/* ================================================================
              5. DEEP TECH FEATURES
              ================================================================ */}
          <H2 id="deep-tech">Deep Tech Features</H2>

          <H3 id="consensus">Sui&apos;s consensus: Narwhal/Bullshark</H3>
          <P>
            DawaTrace leverages Sui&apos;s DAG-based mempool (Narwhal) and BFT consensus (Bullshark), providing parallel transaction
            execution, sub-second finality, and horizontal throughput scaling. Independent batch operations execute in parallel
            without contention — a recall on Batch A does not block operations on Batch B.
          </P>
          <Table headers={['Property', 'Benefit for DawaTrace']} rows={[
            ['Parallel execution', 'Independent batch mints, transfers, and recalls execute concurrently — no global ordering bottleneck'],
            ['Sub-second finality', 'Critical for the <60s recall SLA. Transaction finality in ~480ms on mainnet'],
            ['Object-centric model', 'Each BatchObject is an independent on-chain object with its own ownership and access control'],
            ['Horizontal scaling', 'As more validators join, throughput increases (unlike traditional BFT)'],
          ]} />

          <H3 id="anomaly-detection">Anomaly detection engine</H3>
          <P>
            The platform includes an anomaly detection system that continuously analyzes batch data for suspicious patterns.
            Alerts surface in the regulator dashboard and can trigger investigation workflows.
          </P>
          <Table headers={['Anomaly Type', 'Detection Rule']} rows={[
            ['EXPIRED_DISPENSED', 'Batch past expiry date but still in ACTIVE or IN_TRANSIT status'],
            ['QUANTITY_MISMATCH', 'Batch with zero or negative quantity — data integrity violation'],
            ['RAPID_TRANSFER', 'Batch moved to IN_TRANSIT within 1 hour of creation — suspicious velocity'],
            ['SUSPENDED_CHEMIST', 'Batch currently held by a chemist under suspension review'],
          ]} />

          <H3 id="smart-contract-patterns">Intelligent smart contract patterns</H3>
          <Table headers={['Pattern', 'Implementation', 'Why It Matters']} rows={[
            ['Capability-gated access', 'BridgeCapability required for all writes', 'No address allowlists; supports key rotation without redeployment'],
            ['Frozen immutable records', 'CustodyRecord frozen via transfer::freeze_object', 'Custody history cannot be altered after creation; publicly readable'],
            ['VM-enforced non-transferability', 'DawaPointsLedger has key only (no store)', 'Points cannot be transferred or traded — enforced at VM level'],
            ['Post-shipment invalidation', 'ExportPassport.invalidated flag', 'Recalled batches trigger passport invalidation for importing authorities'],
          ]} />

          <H3 id="tokenization">Non-crypto tokenization</H3>
          <P>
            <strong>DawaPoints</strong> are non-transferable utility credits awarded to whistleblowers who report confirmed counterfeit batches.
            Redeemable only at Jan Aushadhi pharmacies. The Sui <Code>has key</Code> (without <Code>has store</Code>) pattern
            makes them provably non-tradeable at the VM level — not by convention, but by the blockchain&apos;s type system.
          </P>
          <P>
            <strong>ExportPassport</strong> is an NFT issued per export-destined batch, carrying WHO-GMP certificate references
            and batch integrity hashes. Designed for cross-chain verification via LayerZero, allowing importing country
            authorities to verify provenance on their native chain.
          </P>

          {/* ================================================================
              6. SECURITY & PRIVACY
              ================================================================ */}
          <H2 id="security">Security & Privacy</H2>

          <H3 id="pdpb">PDPB 2023 compliance</H3>
          <P>
            Raw Aadhaar numbers are never stored on-chain or transmitted over the network. Patient identity is represented as
            <Code>SHA3-256(aadhaarNumber + batchId + timestamp)</Code>, computed client-side before any network call.
            The raw Aadhaar number never leaves the patient&apos;s device.
          </P>
          <Callout kind="info">
            CustodyRecords contain organizational node IDs (e.g., <Code>DIST-DELHI-002</Code>), not personal names or addresses.
            Frozen records are publicly auditable but contain no personally identifiable information.
          </Callout>

          <H3 id="auth">Authentication & authorization</H3>
          <Table headers={['Layer', 'Mechanism']} rows={[
            ['API authentication', 'JWT tokens with org-role claims (REGULATOR, MANUFACTURER, DISTRIBUTOR, CHEMIST)'],
            ['GraphQL authorization', 'Role-based access control at the resolver level — e.g., only REGULATOR can issue recalls or lift suspensions'],
            ['On-chain access control', 'Capability-based — all write operations require the BridgeCapability object held by the government operator'],
            ['Environment validation', 'Server configuration validated at startup using zod schemas, preventing misconfiguration'],
          ]} />

          <H3 id="integrity">Data integrity</H3>
          <P>
            Each batch carries a <Code>data_hash</Code> field (SHA-256) updated at every state change. Any tampering with off-chain
            data is detectable by comparing against the on-chain hash. Custody records are frozen on Sui and cannot be modified
            after creation.
          </P>

          {/* ================================================================
              7. SCALABILITY & PERFORMANCE
              ================================================================ */}
          <H2 id="scalability">Scalability & Performance</H2>

          <Table headers={['Dimension', 'Approach']} rows={[
            ['Compute scaling', 'Vercel serverless functions — auto-scales with request volume, zero idle server costs'],
            ['Blockchain throughput', 'Sui\'s object-centric model enables parallel transaction execution. Independent batch operations do not contend.'],
            ['Stateless API', 'No mutable server state. Every API invocation is independent — horizontally scalable by definition.'],
            ['Read scalability', 'Sui public RPC nodes are globally distributed. Batch verification reads can hit any fullnode.'],
            ['Monitoring', 'Prometheus metrics collection + Grafana dashboards for recall SLA tracking and transaction latency'],
          ]} />

          <H3 id="targets">Performance targets</H3>
          <Table headers={['Metric', 'Target']} rows={[
            ['Recall propagation (on-chain → UI)', '< 60 seconds'],
            ['Batch verification (QR scan → result)', '< 2 seconds'],
            ['API response time (p95)', '< 500ms'],
            ['Sui transaction finality', '< 1 second'],
          ]} />

          {/* ================================================================
              8. REGULATORY COMPLIANCE
              ================================================================ */}
          <H2 id="compliance">Regulatory Compliance</H2>

          <Table headers={['Regulation', 'How DawaTrace Complies']} rows={[
            ['Personal Data Protection Bill (PDPB) 2023', 'No raw Aadhaar stored anywhere. Patient identity = SHA3-256 hash computed client-side. No PII in on-chain records.'],
            ['Drugs and Cosmetics Act, 1940', 'Recall workflows mirror CDSCO\'s regulatory process. Chemist suspension logic enforces violation thresholds (3 strikes → suspension).'],
            ['Information Technology Act, 2000', 'JWT authentication, role-based access control, capability-gated smart contracts. Immutable audit trail publicly verifiable.'],
            ['WHO GMP Standards', 'ExportPassport NFT carries GMP certificate references for cross-border verification by importing country health authorities.'],
          ]} />

          <Callout kind="info">
            DawaTrace is designed as a tool for regulators, not a replacement. Human regulators (CDSCO, state drug controllers)
            retain full authority over recalls, suspensions, and enforcement actions. The platform provides the data layer and
            automation — decision-making authority remains with authorized officials.
          </Callout>

          {/* ================================================================
              9. BUSINESS MODEL
              ================================================================ */}
          <H2 id="business-model">Business Model</H2>
          <P>
            DawaTrace is designed as a <strong>government-operated public good</strong>, not a commercial SaaS product.
            The platform is operated by C-DAC in partnership with CDSCO, with costs distributed across participating stakeholders.
          </P>

          <H3 id="revenue">Revenue streams</H3>
          <Table headers={['Stream', 'Description']} rows={[
            ['C-DAC licensing', 'C-DAC deploys and operates the platform for CDSCO. State drug authorities pay licensing fees for dashboard access and capability delegation.'],
            ['Manufacturer onboarding', 'Pharmaceutical manufacturers pay a one-time onboarding fee + per-batch minting fee. This covers Sui gas costs, which are sponsored by the government operator node.'],
            ['Jan Aushadhi integration', 'DawaPoints redemption at Jan Aushadhi stores drives footfall to government pharmacies, supporting the existing PMBJP (Pradhan Mantri Bhartiya Janaushadhi Pariyojana) scheme.'],
            ['Export verification fees', 'Importing country health authorities pay for ExportPassport verification API access, creating a revenue stream from India\'s $27B pharmaceutical export market.'],
          ]} />

          <H3 id="costs">Cost structure</H3>
          <Table headers={['Cost', 'Mitigation']} rows={[
            ['Sui gas fees', 'Sponsored by government operator node. Sui\'s gas model is predictable — no auction-based fee spikes.'],
            ['Cloud infrastructure', 'Serverless (Vercel) — pay only for actual usage. No idle server costs.'],
            ['Maintenance', 'Open-source codebase. C-DAC and state IT departments can maintain independently.'],
          ]} />

          {/* ================================================================
              10. PROLIFERATION STRATEGY
              ================================================================ */}
          <H2 id="proliferation">Proliferation Strategy</H2>

          <div className="my-4 space-y-0 border border-border divide-y divide-border">
            {[
              {
                phase: 'Phase 1: Pilot',
                timeline: 'Months 1–6',
                items: [
                  'Deploy on Sui devnet/testnet with 2–3 pharmaceutical manufacturers in one state (Maharashtra or Gujarat — highest pharma manufacturing concentration)',
                  'Integrate with CDSCO\'s existing recall notification system',
                  'Onboard 50–100 chemists in pilot districts for QR verification testing',
                ],
              },
              {
                phase: 'Phase 2: State Rollout',
                timeline: 'Months 6–12',
                items: [
                  'Move to Sui mainnet',
                  'Expand to 5 states with highest counterfeit drug incidence',
                  'Integrate with state drug controller portals for seamless recall propagation',
                  'Launch Jan Aushadhi DawaPoints redemption in pilot pharmacies',
                ],
              },
              {
                phase: 'Phase 3: National Scale',
                timeline: 'Months 12–24',
                items: [
                  'All 36 states and UTs onboarded via capability delegation model',
                  'Manufacturer onboarding mandated for scheduled drugs (Schedule H and H1)',
                  'ExportPassport integration with 5+ importing countries via LayerZero',
                  'Mobile app launch for chemist offline dispensing and patient QR scanning',
                ],
              },
              {
                phase: 'Phase 4: International',
                timeline: '24+ months',
                items: [
                  'WHO endorsement for ExportPassport as a standard for pharmaceutical provenance',
                  'LayerZero bridge live on Ethereum, Polygon, and other chains used by importing country regulators',
                  'Template replicated for other supply chain verticals (medical devices, vaccines, food safety)',
                ],
              },
            ].map((phase) => (
              <div key={phase.phase} className="px-5 py-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <p className="text-xs font-medium">{phase.phase}</p>
                  <span className="text-[11px] font-mono text-muted-foreground">{phase.timeline}</span>
                </div>
                <ul className="space-y-1">
                  {phase.items.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-muted-foreground/50 shrink-0">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <H3 id="replicability">Replicability across states</H3>
          <P>
            The architecture supports multi-state deployment through capability delegation. Each state runs its own Next.js
            instance pointing to the same Sui network. A batch minted in Maharashtra is verifiable in Tamil Nadu without
            cross-state API calls. The central <Code>AdminCapability</Code> holder (C-DAC / CDSCO) can issue
            <Code>BridgeCapability</Code> objects to authorized state operators. With 11 Indian languages built in,
            the platform covers approximately 95% of the population.
          </P>

          {/* ================================================================
              11. GOVERNMENT COLLABORATION
              ================================================================ */}
          <H2 id="govt-collaboration">Government Collaboration</H2>
          <P>
            DawaTrace is designed for deployment in partnership with central and state government bodies.
            The platform&apos;s architecture, access control model, and data flows are built to align with existing
            regulatory structures and can be integrated with government IT infrastructure.
          </P>

          <Table headers={['Entity', 'Intended Role', 'Integration Points']} rows={[
            ['C-DAC (Centre for Development of Advanced Computing)', 'Technical partner — hosts infrastructure, operates Sui validator node, manages capability delegation', 'Platform deployment, validator operations, technical support for state IT departments'],
            ['CDSCO (Central Drugs Standard Control Organisation)', 'Regulatory authority — issues recalls, defines violation thresholds, audits analytics', 'Dashboard access, recall workflow integration, batch approval pipeline'],
            ['State Drug Controllers (36 states & UTs)', 'State-level operators — onboard local manufacturers and distributors, monitor regional dashboards', 'Capability delegation, state-specific dashboard instances, local language support'],
            ['Jan Aushadhi (PMBJP)', 'DawaPoints redemption partner — government pharmacies where whistleblower credits are redeemed', 'POS integration for point redemption, footfall analytics for PMBJP reporting'],
            ['NIC (National Informatics Centre)', 'Integration partner — connects DawaTrace APIs with existing government health IT systems', 'API gateway integration with Drug Licensing portal, NHA Health ID linkage'],
          ]} />

          <Callout kind="warn">
            The collaborations listed above represent the intended deployment model based on the platform&apos;s design.
            Formal partnerships and MoUs are to be established during the pilot phase in coordination with C-DAC
            and the respective government departments.
          </Callout>

          {/* ================================================================
              FOOTER
              ================================================================ */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">DawaTrace</p>
                <p className="text-xs text-muted-foreground mt-0.5">Submitted to CDAC Blockchain India Challenge 2026</p>
              </div>
              <div className="flex gap-4">
                <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Developer Docs</Link>
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
