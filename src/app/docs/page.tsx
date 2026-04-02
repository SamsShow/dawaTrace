'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

function Code({ children }: { children: string }) {
  return <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 border border-border">{children}</code>;
}

function Pre({ children }: { children: string }) {
  return (
    <div className="my-4 border border-border bg-muted/40">
      <pre className="px-4 py-3.5 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre">{children}</pre>
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
  const styles = { info: 'border-border bg-muted/30', warn: 'border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-700/40', danger: 'border-destructive/30 bg-destructive/5' };
  const labels = { info: 'Note', warn: 'Warning', danger: 'Important' };
  const labelColor = { info: 'text-foreground', warn: 'text-amber-700 dark:text-amber-400', danger: 'text-destructive' };
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
        <thead><tr className="border-b border-border bg-muted/40">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} className={cn('px-3 py-2', j === 0 ? 'font-mono font-medium' : 'text-muted-foreground')}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">DawaTrace</Link>
          <nav className="flex items-center gap-4">
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
