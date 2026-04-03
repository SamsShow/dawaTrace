import { cn } from '@/lib/utils';

export function Code({ children }: { children: string }) {
  return <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 border border-border">{children}</code>;
}

export function Pre({ children }: { children: string }) {
  return (
    <div className="my-4 border border-border bg-muted/40">
      <pre className="px-4 py-3.5 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre">{children}</pre>
    </div>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-base font-semibold mt-10 mb-3 scroll-mt-20">{children}</h2>;
}

export function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return <h3 id={id} className="text-sm font-semibold mt-6 mb-2 scroll-mt-20">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

export function Callout({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'danger'; children: React.ReactNode }) {
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

export function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
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
