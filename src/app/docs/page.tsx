'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { Code, Pre, H2, H3, P, Callout, Table } from '@/components/docs/primitives';

export default function Docs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">DawaTrace</Link>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-3">Documentation</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-8">DawaTrace Developer Guide</h1>

        <H2 id="overview">Overview</H2>
        <P>DawaTrace is a blockchain platform for India&apos;s pharmaceutical supply chain, built for the CDAC Blockchain India Challenge 2026. Every batch of medicine is tracked and publicly verifiable on <Code>Sui</Code>.</P>

        <H2 id="architecture">Architecture</H2>
        <P>All supply chain logic runs in Move smart contracts on Sui with capability-based access control. Only authorized addresses (manufacturers, distributors, chemists, regulators) can perform actions. Anyone can verify batch authenticity via the public Sui RPC.</P>

        <H2 id="stakeholders">Stakeholders</H2>
        <Table headers={['Org ID', 'Role', 'Primary actions']} rows={[
          ['CDSCO-REG-*', 'Regulator', 'issueRecall, flagChemist, analytics'],
          ['MFG-*', 'Manufacturer', 'mintBatch'],
          ['DIST-*', 'Distributor', 'transferBatch'],
          ['CHEM-*', 'Chemist', 'dispenseMedicine (offline-capable)'],
          ['—', 'Patient', 'verifyBatch, report suspicious batch'],
        ]} />

        <H2 id="sui">Sui Smart Contracts</H2>
        <Table headers={['Module', 'File', 'Description']} rows={[
          ['dawa_trace::batch', 'batch.move', 'BatchObject, mint_batch, mark_recalled, verify_batch'],
          ['dawa_trace::custody', 'custody.move', 'CustodyRecord (frozen), transfer_custody'],
          ['dawa_trace::dawa_points', 'dawa_points.move', 'Non-transferable loyalty points'],
          ['dawa_trace::bridge_cap', 'bridge_cap.move', 'Capability-based access control'],
        ]} />

        <H3 id="verify">Public verification</H3>
        <P>Anyone can call <Code>verify_batch</Code> against the public Sui RPC — no API key, no login required.</P>

        <H3 id="recall-sla">Recall SLA</H3>
        <Pre>{`Regulator issues recall via dashboard
  → Sui mark_recalled tx submitted            (~5s)
  → BatchObject.recalled = true on-chain       (~10s)
  → Dashboard polls and reflects recall
───────────────────────────────────────────────
Total: typically 10–15s, hard limit 60s`}</Pre>

        <H2 id="getting-started">Getting Started</H2>
        <Pre>{`# Publish Sui contracts to devnet
make sui-deploy

# Start the web app (Next.js)
npm run dev`}</Pre>

        <H2 id="env">Environment Variables</H2>
        <P>Copy <Code>.env.example</Code> to <Code>.env</Code>. Critical variables:</P>
        <Table headers={['Variable', 'Description']} rows={[
          ['SUI_RPC_URL', 'Sui fullnode RPC (default: devnet)'],
          ['SUI_PACKAGE_ID', 'Published Sui package ID'],
          ['API_JWT_SECRET', 'JWT signing secret (min 32 chars)'],
        ]} />
      </div>
    </div>
  );
}
