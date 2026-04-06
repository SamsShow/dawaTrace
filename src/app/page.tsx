'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Zap, Smartphone, Globe, Lock, Activity } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const STATS = [
  { value: '<60s', label: 'Recall propagation SLA', sub: 'On-chain recall → UI update' },
  { value: '11', label: 'Indian languages', sub: 'Hindi, Tamil, Telugu, Bengali + 7 more' },
  { value: '4', label: 'Org types on-chain', sub: 'Manufacturer · Distributor · Chemist · Regulator' },
  { value: '0', label: 'Gas cost for users', sub: 'Government node sponsors all Sui transactions' },
];

const FEATURES = [
  { icon: Shield, title: 'On-chain integrity', body: 'All supply chain state lives on Sui. Access-controlled via capability objects — only authorized orgs can mint, transfer, or recall.' },
  { icon: Zap, title: '<60s recall SLA', body: 'Regulator issues a recall, Sui marks the batch as recalled on-chain, and the dashboard reflects it — all within seconds.' },
  { icon: Smartphone, title: 'Offline chemist mode', body: 'Dispense records queue in SQLite when offline. Sync flushes on reconnect. On-chain commit happens transparently — no data lost.' },
  { icon: Globe, title: 'Patient QR verification', body: 'Anyone can scan the QR on a medicine and get an authentic / recalled result directly from Sui — no login or app account needed.' },
  { icon: Lock, title: 'PDPB compliant', body: 'Raw Aadhaar never leaves the device. Mobile computes SHA3-256(aadhaar + batchId + timestamp) client-side before any network call.' },
  { icon: Activity, title: 'DawaPoints incentives', body: 'Patients earn non-transferable DawaPoints on Sui for verified suspicious batch reports, redeemable at Jan Aushadhi pharmacies.' },
];

const RECALL_STEPS = [
  { n: '01', actor: 'CDSCO Regulator', action: 'Issues recall via dashboard or API' },
  { n: '02', actor: 'Sui smart contract', action: 'mark_recalled sets batch status on-chain' },
  { n: '03', actor: 'Dashboard', action: 'Polls Sui and reflects recall in real time' },
  { n: '04', actor: 'All stakeholders', action: 'Mobile apps and QR verification show recalled status' },
];

const STACK = [
  { layer: 'Blockchain', tech: 'Sui · Move', detail: 'BatchObject · CustodyRecord · DawaPoints (non-transferable) · ExportPassport · capability-based access control' },
  { layer: 'API gateway', tech: 'Next.js API Routes · GraphQL', detail: 'JWT auth, org-role RBAC, SuiClient queries and transactions' },
  { layer: 'Regulator dashboard', tech: 'Next.js · React · Tailwind', detail: 'Live batch table, custody timeline, one-click recall, analytics charts' },
  { layer: 'Infrastructure', tech: 'Docker · Prometheus · Grafana', detail: 'Recall SLA monitoring, Nginx reverse proxy' },
];

const ORGS = [
  { id: 'CDSCO', role: 'Regulator', desc: 'Issues recalls, audits violations, views analytics' },
  { id: 'MFG', role: 'Manufacturer', desc: 'Mints batches, uploads GMP certificates' },
  { id: 'DIST', role: 'Distributor', desc: 'Transfers custody, logs GPS waypoints' },
  { id: 'CHEM', role: 'Chemist', desc: 'Dispenses to patients; offline-capable' },
  { id: 'PAT', role: 'Patient', desc: 'Scans QR, verifies on Sui, earns DawaPoints' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">DawaTrace</span>
          <nav className="flex items-center gap-6">
            <a href="#how-it-works" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">How it works</a>
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#stack" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Stack</a>
            <Link href="/verify" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Verify</Link>
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">About</Link>
            <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Docs</Link>
            <ThemeToggle />
            <Link href="/login" className="text-xs border border-border px-3 py-1.5 hover:bg-accent transition-colors">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl mb-6">
            Every medicine batch.<br />
            <span className="text-muted-foreground font-normal">Tracked, verified, recalled in under 60 seconds.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed mb-10">
            DawaTrace is a blockchain platform for India&apos;s pharmaceutical supply chain,
            built on Sui. Every batch is tracked on-chain with capability-based access control.
            Anyone can verify a medicine&apos;s authenticity via a public QR scan.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 bg-foreground text-background text-xs px-5 py-2.5 hover:opacity-90 transition-opacity font-medium">
              Open dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/verify" className="inline-flex items-center gap-2 border border-border text-xs px-5 py-2.5 hover:bg-accent transition-colors">
              <Shield className="h-3.5 w-3.5" /> Verify a medicine
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 border border-border text-xs px-5 py-2.5 hover:bg-accent transition-colors">How it works</a>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {STATS.map((s) => (
              <div key={s.label} className="px-6 py-8">
                <p className="text-3xl font-semibold tabular-nums tracking-tight mb-1">{s.value}</p>
                <p className="text-xs font-medium mb-1">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-6">Who uses it</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-border divide-x divide-y md:divide-y-0 divide-border">
            {ORGS.map((o) => (
              <div key={o.id} className="px-4 py-4">
                <p className="text-[11px] font-mono text-muted-foreground mb-1">{o.id}</p>
                <p className="text-xs font-medium mb-1.5">{o.role}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-3">How it works</p>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-10">
            <h2 className="text-xl font-semibold tracking-tight">Recall propagation in &lt;60 seconds</h2>
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-2 shrink-0">
              <p className="text-xs font-semibold text-destructive">SLA target: &lt;60s end-to-end</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">On-chain recall → dashboard update</p>
            </div>
          </div>
          <div className="space-y-0 border border-border divide-y divide-border">
            {RECALL_STEPS.map((step) => (
              <div key={step.n} className="flex items-start gap-5 px-5 py-4 bg-background hover:bg-muted/20 transition-colors">
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-6 pt-0.5">{step.n}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{step.actor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.action}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 border border-border">
            <div className="px-5 py-5">
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wide mb-2">Sui</p>
              <p className="text-xs font-medium mb-1.5">Public verification layer + supply chain logic</p>
              <p className="text-xs text-muted-foreground leading-relaxed">All supply chain state lives on Sui with capability-based access control. Manufacturers, distributors, regulators, and chemists interact via authorized addresses. Anyone can verify a batch against the public RPC.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-3">Features</p>
          <h2 className="text-xl font-semibold tracking-tight mb-8">Built for India&apos;s supply chain reality</h2>
          <div className="grid md:grid-cols-3 border border-border">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={['px-5 py-5 hover:bg-muted/20 transition-colors', i < 3 ? 'border-b border-border' : '', i % 3 !== 2 ? 'md:border-r md:border-border' : ''].join(' ')}>
                <f.icon className="h-4 w-4 text-muted-foreground mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium mb-2">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stack" className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-3">Technical stack</p>
          <h2 className="text-xl font-semibold tracking-tight mb-8">Architecture</h2>
          <div className="border border-border divide-y divide-border">
            {STACK.map((s, i) => (
              <div key={i} className="grid md:grid-cols-[180px_220px_1fr] hover:bg-muted/20 transition-colors">
                <div className="px-4 py-3 md:border-r border-border"><p className="text-[11px] text-muted-foreground">{s.layer}</p></div>
                <div className="px-4 py-3 md:border-r border-border"><p className="text-xs font-mono font-medium">{s.tech}</p></div>
                <div className="px-4 py-3"><p className="text-xs text-muted-foreground">{s.detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-lg">
            <h2 className="text-xl font-semibold tracking-tight mb-2">Explore the regulator dashboard</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">View live batch data, inspect the chain of custody on Sui, and issue recalls with a one-click form.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-foreground text-background text-xs px-6 py-3 hover:opacity-90 transition-opacity font-medium">
              Open dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/docs" className="inline-flex items-center justify-center gap-2 border border-border text-xs px-6 py-3 hover:bg-accent transition-colors">Read the docs</Link>
          </div>
        </div>
      </section>

      <footer className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold mb-1">DawaTrace</p>
              <p className="text-xs text-muted-foreground">Pharmaceutical supply chain on Sui</p>
              <p className="text-[11px] text-muted-foreground mt-1">Submitted to CDAC Blockchain India Challenge 2026</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-12 gap-y-4 text-xs">
              <div>
                <p className="font-medium mb-2">Platform</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                  <li><Link href="/docs" className="hover:text-foreground transition-colors">Developer Docs</Link></li>
                  <li><Link href="/login" className="hover:text-foreground transition-colors">Dashboard</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Blockchain</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Sui Devnet</li><li>Move (smart contracts)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Backend</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Next.js</li><li>Apollo GraphQL</li><li>TypeScript</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Frontend</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>React 19</li><li>Tailwind CSS</li><li>11 Indian languages</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
