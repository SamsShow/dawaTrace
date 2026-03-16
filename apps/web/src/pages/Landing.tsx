import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Smartphone, Globe, Lock, Activity } from 'lucide-react';

const STATS = [
  { value: '<60s', label: 'Recall propagation SLA' },
  { value: '11', label: 'Indian languages' },
  { value: '4', label: 'Supply chain org types' },
  { value: '100%', label: 'Offline-capable mobile' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Dual-chain integrity',
    body: 'Hyperledger Fabric handles permissioned regulatory logic. Sui provides a public, tamper-evident verification layer. Neither chain alone is a single point of failure.',
  },
  {
    icon: Zap,
    title: '<60s recall SLA',
    body: 'A dedicated bridge relay listens for RecallEvents on Fabric and anchors them to Sui via an URGENT priority queue. End-to-end in under 60 seconds.',
  },
  {
    icon: Smartphone,
    title: 'Offline chemist mode',
    body: 'Dispense records queue locally in SQLite when connectivity drops. Sync flushes automatically on reconnect. Fabric commit happens transparently in the background.',
  },
  {
    icon: Globe,
    title: 'Patient QR verification',
    body: 'Patients scan the QR on any medicine and get an instant authentic / recalled verdict directly from Sui — no login, no app account required.',
  },
  {
    icon: Lock,
    title: 'PDPB compliant',
    body: 'Raw Aadhaar numbers never leave the device. The mobile app computes SHA3-256(aadhaar + batchId + timestamp) client-side before any network call.',
  },
  {
    icon: Activity,
    title: 'DawaPoints incentives',
    body: 'Patients earn non-transferable DawaPoints on Sui for reporting suspicious batches. Points redeem at Jan Aushadhi pharmacies for generic medicines.',
  },
];

const STACK = [
  {
    layer: 'Permissioned core',
    tech: 'Hyperledger Fabric',
    detail: 'Go chaincode — mintBatch, transferBatch, dispenseMedicine, issueRecall, flagChemist',
  },
  {
    layer: 'Bridge relay',
    tech: 'TypeScript',
    detail: 'Listens to Fabric events, computes SHA-256, submits PTBs to Sui. Redis-backed priority queue.',
  },
  {
    layer: 'Public verification',
    tech: 'Sui (Move)',
    detail: 'BatchObject, CustodyRecord, DawaPoints, ExportPassport, BridgeCapability key rotation.',
  },
  {
    layer: 'API gateway',
    tech: 'Express + Apollo GraphQL',
    detail: 'JWT auth with org roles, REST + GraphQL, Fabric Gateway SDK, SuiClient.',
  },
  {
    layer: 'Regulator dashboard',
    tech: 'React + Vite',
    detail: 'Real-time batch table, one-click recall, custody timeline, analytics charts.',
  },
  {
    layer: 'Chemist / patient app',
    tech: 'React Native + Expo',
    detail: 'QR scan, offline dispense, zkLogin scaffold, 11 languages, expo-sqlite sync queue.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">DawaTrace</span>
          <div className="flex items-center gap-6">
            <a href="#architecture" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Architecture
            </a>
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <Link
              to="/login"
              className="text-xs border border-border px-3 py-1.5 hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
            CDAC Blockchain India Challenge 2026
          </p>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight max-w-2xl mb-5">
            Pharmaceutical supply chain.{' '}
            <span className="text-muted-foreground font-normal">Verified.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed mb-8">
            DawaTrace anchors every batch — from manufacturer to chemist to patient — on Hyperledger
            Fabric with public verification on Sui. Recalls propagate across the entire chain in
            under 60 seconds. Works in 11 Indian languages, including offline.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 bg-foreground text-background text-xs px-4 py-2 hover:opacity-90 transition-opacity"
            >
              Open dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-1.5 border border-border text-xs px-4 py-2 hover:bg-accent transition-colors"
            >
              View architecture
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {STATS.map((s) => (
              <div key={s.label} className="px-6 py-8">
                <p className="text-3xl font-semibold tabular-nums tracking-tight mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
              The problem
            </p>
            <h2 className="text-xl font-semibold tracking-tight mb-4">
              Counterfeit drugs reach patients because the supply chain is opaque.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              India's pharmaceutical supply chain spans thousands of manufacturers, distributors, and
              chemists. When a batch is recalled, there is no reliable mechanism to guarantee that
              every stakeholder is notified in time. Counterfeit medicines enter at distribution
              gaps that existing paper-based tracking cannot detect.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
              The approach
            </p>
            <h2 className="text-xl font-semibold tracking-tight mb-4">
              Immutable on-chain records with a public verification layer.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every custody transfer and recall is committed to Hyperledger Fabric by the
              authorised organisation. A bridge relay immediately anchors the hash to Sui — a public
              blockchain accessible to anyone, including patients with no login — so that
              authenticity can be verified without trusting any single organisation.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Architecture
          </p>
          <h2 className="text-xl font-semibold tracking-tight mb-8">Six-layer stack</h2>

          <div className="border border-border divide-y divide-border">
            {STACK.map((s, i) => (
              <div key={i} className="grid md:grid-cols-[160px_180px_1fr] gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{s.layer}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-mono font-medium">{s.tech}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Flow diagram */}
          <div className="mt-8 border border-border p-6">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-5">
              Recall flow
            </p>
            <div className="flex flex-wrap items-center gap-0 text-xs">
              {[
                { label: 'CDSCO regulator', sub: 'issues recall' },
                { label: 'Fabric chaincode', sub: 'marks RECALLED, emits RecallEvent' },
                { label: 'Bridge relay', sub: 'URGENT queue lane, ~5s' },
                { label: 'Sui mark_recalled', sub: 'BatchObject updated' },
                { label: 'Patient app', sub: 'scan → red screen' },
              ].map((step, i, arr) => (
                <div key={i} className="flex items-center">
                  <div className="border border-border px-3 py-2 bg-background">
                    <p className="font-medium text-foreground">{step.label}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">{step.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-2 shrink-0" />
                  )}
                </div>
              ))}
              <div className="ml-3 border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-xs font-semibold text-destructive">Total: &lt;60s</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="text-xl font-semibold tracking-tight mb-8">Built for India's supply chain</h2>

          <div className="grid md:grid-cols-3 gap-0 border border-border divide-y md:divide-y-0 md:divide-x divide-border">
            {FEATURES.slice(0, 3).map((f) => (
              <div key={f.title} className="px-5 py-5">
                <f.icon className="h-4 w-4 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-2">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-0 border border-t-0 border-border divide-y md:divide-y-0 md:divide-x divide-border">
            {FEATURES.slice(3).map((f) => (
              <div key={f.title} className="px-5 py-5">
                <f.icon className="h-4 w-4 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-2">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">
              Ready to explore the dashboard?
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your CDSCO regulator credentials to view live batch data and issue recalls.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 bg-foreground text-background text-xs px-5 py-2.5 hover:opacity-90 transition-opacity shrink-0"
          >
            Open dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">DawaTrace</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Submitted to CDAC Blockchain India Challenge 2026
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Hyperledger Fabric · Sui · TypeScript · Go · React Native
          </p>
        </div>
      </footer>
    </div>
  );
}
