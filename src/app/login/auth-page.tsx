'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh', 'Dadra and Nagar Haveli', 'Lakshadweep', 'Andaman and Nicobar',
];

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'register') setMode('register');
    else setMode('login');
  }, [searchParams]);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setRegisterStep(1);
    router.replace(m === 'register' ? '/login?mode=register' : '/login', { scroll: false });
  };

  // Login state
  const [nodeId, setNodeId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [drugLicense, setDrugLicense] = useState('');
  const [regState, setRegState] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successNodeId, setSuccessNodeId] = useState('');
  const [successRole, setSuccessRole] = useState('');

  // Shared
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nodeId || !loginPassword) { setError('Node ID and password are required.'); return; }

    setLoading(true);
    try {
      const res = await signIn('credentials', { nodeId, password: loginPassword, redirect: false });
      if (res?.error) { setError('Invalid Node ID or password.'); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = inviteCode.trim();
    if (!code) { setError('Enter an invite code.'); return; }
    if (code.length < 6) { setError('Invite code must be 6 characters.'); return; }
    setRegisterStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    if (regPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (regPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          orgName: orgName.trim(),
          drugLicenseNumber: drugLicense.trim() || undefined,
          state: regState || undefined,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return; }
      setSuccessNodeId(data.nodeId);
      setSuccessRole(data.orgRole);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state after registration
  if (successNodeId) {
    return (
      <div className="min-h-screen bg-background flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6">
          <div className="w-full max-w-[360px]">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Account created</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Your Node ID is:</p>
              <p className="text-lg font-mono font-semibold tracking-wide">{successNodeId}</p>
              <p className="text-xs text-muted-foreground mt-2">Role: {successRole}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Save your Node ID — you&apos;ll use it to sign in.</p>
            <Button className="w-full h-11" onClick={() => { setSuccessNodeId(''); switchMode('login'); }}>
              Go to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <LeftPanel />

      {/* Right — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-background">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold tracking-tight">DawaTrace</span>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-muted rounded-lg p-1 mb-8">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create account
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Sign in to the regulatory portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="nodeId" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Node ID</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 10h.01M10 10h.01M14 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <Input id="nodeId" value={nodeId} onChange={(e) => setNodeId(e.target.value)} placeholder="CDSCO-REG-001" autoComplete="username" className="h-11 pl-10 font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loginPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <Input id="loginPassword" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" className="h-11 pl-10 text-sm" />
                  </div>
                </div>

                <ErrorMessage error={error} />

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? <Spinner text="Signing in..." /> : 'Sign in'}
                </Button>
              </form>
            </>
          ) : registerStep === 1 ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Enter the invite code from your upstream partner</p>
              </div>

              <form onSubmit={handleInviteCodeSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCode" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="h-14 font-mono tracking-[0.3em] text-center text-xl"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Your invite code determines your role. Ask your regulator, manufacturer, or distributor for a code.
                  </p>
                </div>

                <ErrorMessage error={error} />

                <Button type="submit" className="w-full h-11 text-sm font-medium">
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Complete registration</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Fill in your organization details</p>
              </div>

              {/* Invite code badge */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 mb-5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invite code</p>
                  <p className="text-sm font-mono font-semibold tracking-wider">{inviteCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setRegisterStep(1); setError(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="orgName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</Label>
                    <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Sun Pharma" className="h-11 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="regState" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">State</Label>
                    <select
                      id="regState"
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drugLicense" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drug License Number <span className="normal-case font-normal">(if applicable)</span></Label>
                  <Input id="drugLicense" value={drugLicense} onChange={(e) => setDrugLicense(e.target.value)} placeholder="DL-MH-2024-001234" className="h-11 font-mono text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="regPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                    <Input id="regPassword" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Min 8 chars" className="h-11 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter" className="h-11 text-sm" />
                  </div>
                </div>

                <ErrorMessage error={error} />

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? <Spinner text="Creating account..." /> : 'Create account'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared sub-components ---------- */

function LeftPanel() {
  return (
    <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-zinc-950">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">DawaTrace</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-white text-3xl font-semibold leading-tight tracking-tight max-w-sm">
            Pharmaceutical supply chain on the blockchain
          </h2>
          <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
            End-to-end traceability from manufacturer to patient. Every batch verified, every transfer recorded, every anomaly flagged.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-white text-2xl font-semibold tabular-nums">12,847</div>
              <div className="text-zinc-500 text-xs mt-0.5">Batches tracked</div>
            </div>
            <div>
              <div className="text-white text-2xl font-semibold tabular-nums">99.7%</div>
              <div className="text-zinc-500 text-xs mt-0.5">Verification rate</div>
            </div>
            <div>
              <div className="text-white text-2xl font-semibold tabular-nums">340+</div>
              <div className="text-zinc-500 text-xs mt-0.5">Supply nodes</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Secured on Sui Network
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {error}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      {text}
    </span>
  );
}
