import Link from 'next/link';
import { Shield, ShieldAlert, ShieldCheck, ArrowLeft, ExternalLink, Clock, Package, Hash, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { verifyBatch } from '@/lib/server/sui/queries';
import ThemeToggle from '@/components/ThemeToggle';

interface PageProps {
  params: Promise<{ objectId: string }>;
}

export default async function VerifyResult({ params }: PageProps) {
  const { objectId } = await params;
  let result: Awaited<ReturnType<typeof verifyBatch>> | null = null;
  let error: string | null = null;

  try {
    result = await verifyBatch(objectId);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to verify batch';
  }

  const explorerUrl = `https://suiscan.xyz/testnet/object/${objectId}`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Home</Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Back link */}
        <Link href="/verify" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> New verification
        </Link>

        {error ? (
          /* Error state */
          <Card className="border-destructive/50">
            <CardHeader className="items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-2">
                <ShieldAlert className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">
                This could mean the Object ID is invalid, the batch does not exist on Sui, or the network is temporarily unavailable.
              </p>
              <Link href="/verify">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Try another ID
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : result ? (
          <>
            {/* Result card */}
            <Card className={result.recalled ? 'border-destructive/50' : 'border-emerald-500/50'}>
              <CardHeader className="items-center text-center pb-2">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 ${result.recalled ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                  {result.recalled
                    ? <ShieldAlert className="h-8 w-8 text-destructive" />
                    : <ShieldCheck className="h-8 w-8 text-emerald-500" />
                  }
                </div>
                <Badge variant={result.recalled ? 'destructive' : 'default'} className="text-sm px-4 py-1">
                  {result.recalled ? 'RECALLED' : 'AUTHENTIC'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1 pt-4">
                {result.recalled && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4">
                    <p className="text-sm font-medium text-destructive">This batch has been recalled by CDSCO.</p>
                    <p className="text-xs text-muted-foreground mt-1">Do not consume this medicine. Return it to the pharmacy where it was purchased.</p>
                  </div>
                )}

                <div className="divide-y divide-border">
                  <div className="flex items-center gap-3 py-3">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">Batch ID</p>
                      <p className="text-sm font-mono font-medium">{result.batchId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">Expiry Date</p>
                      <p className="text-sm font-medium">{result.expiryDate}</p>
                    </div>
                    {new Date(result.expiryDate) < new Date() && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 py-3">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">Data Hash (SHA-256)</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{result.dataHash}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-3">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">Sui Object ID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{result.suiObjectId}</p>
                    </div>
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        Explorer <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custody chain */}
            {result.custodyChain.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Chain of Custody</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0">
                    {result.custodyChain.map((record, i) => (
                      <div key={record.objectId} className="relative flex gap-3 pb-4 last:pb-0">
                        {/* Timeline line */}
                        {i < result.custodyChain.length - 1 && (
                          <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                        )}
                        {/* Dot */}
                        <div className="relative z-10 mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-border bg-background flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        </div>
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-mono font-medium">{record.fromNode}</span>
                            <span className="text-[11px] text-muted-foreground">→</span>
                            <span className="text-xs font-mono font-medium">{record.toNode}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Qty: {record.quantity} · Transfer #{record.sequence}
                            {record.timestamp > 0 && ` · ${new Date(record.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        <p className="text-xs text-muted-foreground text-center">
          Verified on-chain via <Link href="/" className="font-medium text-foreground hover:underline">DawaTrace</Link> · No login required
        </p>
      </div>
    </div>
  );
}
