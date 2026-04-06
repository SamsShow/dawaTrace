'use client';

import { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Shield, Camera, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';

const QRScanner = lazy(() => import('@/components/QRScanner'));

export default function VerifyLanding() {
  const router = useRouter();
  const [objectId, setObjectId] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'manual' | 'scan'>('manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const id = objectId.trim();
    if (!id) { setError('Enter a Sui Object ID.'); return; }
    if (!id.startsWith('0x') || id.length < 10) { setError('Invalid Sui Object ID. Must start with 0x.'); return; }
    router.push(`/verify/${id}`);
  };

  const handleScan = (scannedId: string) => {
    router.push(`/verify/${scannedId}`);
  };

  const handleScanError = (err: string) => {
    setError(err);
    setMode('manual');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Home</Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Verify Medicine</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scan the QR code on the medicine package or enter the Sui Object ID manually.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Batch Verification</CardTitle>
                <CardDescription>No login required — reads directly from Sui blockchain.</CardDescription>
              </div>
            </div>
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg border border-border p-1 mt-3">
              <button
                onClick={() => { setMode('scan'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'scan' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Camera className="h-3.5 w-3.5" /> Scan QR
              </button>
              <button
                onClick={() => { setMode('manual'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'manual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Keyboard className="h-3.5 w-3.5" /> Enter ID
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {mode === 'scan' ? (
              <div className="space-y-4">
                <Suspense fallback={
                  <div className="h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Loading camera...</p>
                  </div>
                }>
                  <QRScanner onScan={handleScan} onError={handleScanError} />
                </Suspense>
                <p className="text-xs text-muted-foreground text-center">
                  Point your camera at the QR code on the medicine package
                </p>
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objectId">Sui Object ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="objectId"
                      value={objectId}
                      onChange={(e) => setObjectId(e.target.value)}
                      placeholder="0xabc123..."
                      className="pl-9 font-mono text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full gap-2">
                  <Search className="h-4 w-4" /> Verify Batch
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Powered by <Link href="/" className="font-medium text-foreground hover:underline">DawaTrace</Link> on Sui blockchain
        </p>
      </div>
    </div>
  );
}
