'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setAuth } from '@/lib/auth';

export default function Login() {
  const [nodeId, setNodeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nodeId || !password) { setError('Node ID and password are required.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      setAuth(data.token, data.user);
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <h1 className="text-base font-semibold">DawaTrace</h1>
          <p className="text-xs text-muted-foreground mt-1">Sign in to the regulatory portal</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nodeId">Node ID</Label>
            <Input id="nodeId" value={nodeId} onChange={(e) => setNodeId(e.target.value)} placeholder="CDSCO-REG-001" autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-foreground hover:underline">Register with invite code</Link>
        </p>
      </div>
    </div>
  );
}
