'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [orgName, setOrgName] = useState('');
  const [drugLicense, setDrugLicense] = useState('');
  const [state, setState] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successNodeId, setSuccessNodeId] = useState('');

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!inviteCode.trim()) { setError('Enter an invite code.'); return; }
    if (inviteCode.trim().length < 6) { setError('Invite code must be 6 characters.'); return; }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!orgName.trim()) { setError('Organization name is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          orgName: orgName.trim(),
          drugLicenseNumber: drugLicense.trim() || undefined,
          state: state || undefined,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      setSuccessNodeId(data.nodeId);
      setTargetRole(data.orgRole);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successNodeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-xs">
          <div className="border border-green-500/40 bg-green-500/5 px-4 py-4 mb-6">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Account created</p>
            <p className="text-xs text-muted-foreground">Your Node ID is:</p>
            <p className="text-sm font-mono font-semibold mt-1">{successNodeId}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Role: {targetRole}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Save your Node ID — you&apos;ll use it to sign in.</p>
          <Button className="w-full" onClick={() => router.push('/login')}>Go to Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <h1 className="text-base font-semibold">DawaTrace</h1>
          <p className="text-xs text-muted-foreground mt-1">Register with invite code</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleValidateCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono tracking-widest text-center text-lg"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Validating...' : 'Continue'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="border border-border px-3 py-2 mb-2">
              <p className="text-[11px] text-muted-foreground">Invite code</p>
              <p className="text-xs font-mono">{inviteCode}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Sun Pharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drugLicense">Drug License Number</Label>
              <Input id="drugLicense" value={drugLicense} onChange={(e) => setDrugLicense(e.target.value)} placeholder="DL-MH-2024-001234" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <button type="button" onClick={() => { setStep(1); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Back to invite code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
