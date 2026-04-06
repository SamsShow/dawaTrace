'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';

export default function VerifyLanding() {
  const router = useRouter();
  const [objectId, setObjectId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const id = objectId.trim();
    if (!id) { setError('Enter a Sui Object ID.'); return; }
    if (!id.startsWith('0x') || id.length < 10) { setError('Invalid Sui Object ID. Must start with 0x.'); return; }
    router.push(`/verify/${id}`);
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
            Check if a medicine batch is authentic by entering its Sui Object ID or scanning the QR code on the package.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Verification</CardTitle>
            <CardDescription>No login required — verification is public and reads directly from Sui blockchain.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Powered by <Link href="/" className="font-medium text-foreground hover:underline">DawaTrace</Link> on Sui blockchain
        </p>
      </div>
    </div>
  );
}
