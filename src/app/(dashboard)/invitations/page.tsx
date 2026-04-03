'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Mail, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useMyInvitations, useCreateInvitation } from '@/hooks/useInvitations';

const ALLOWED_INVITES: Record<string, string[]> = {
  REGULATOR: ['MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST'],
  MANUFACTURER: ['DISTRIBUTOR'],
  DISTRIBUTOR: ['CHEMIST'],
  CHEMIST: [],
};

function getInviteStatus(inv: { usedBy: string | null; expiresAt: number }): { label: string; variant: 'default' | 'success' | 'destructive' } {
  if (inv.usedBy) return { label: 'Used', variant: 'default' };
  if (inv.expiresAt < Date.now()) return { label: 'Expired', variant: 'destructive' };
  return { label: 'Pending', variant: 'success' };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function Invitations() {
  const { user } = useAuth();
  const { data, loading } = useMyInvitations();
  const [createInvitation, { loading: creating }] = useCreateInvitation();
  const [targetRole, setTargetRole] = useState('');
  const [targetOrgName, setTargetOrgName] = useState('');
  const [error, setError] = useState('');

  const allowedRoles = ALLOWED_INVITES[user?.orgRole ?? ''] ?? [];
  const invitations = data?.myInvitations ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!targetRole) { setError('Select a role.'); return; }
    try {
      await createInvitation({ variables: { targetRole, targetOrgName: targetOrgName.trim() || undefined } });
      setTargetRole('');
      setTargetOrgName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
    }
  };

  return (
    <>
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Invitations</h1>
      </div>

      {allowedRoles.length > 0 && (
        <div className="px-6 py-6 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Create Invitation</h2>
          <form onSubmit={handleCreate} className="flex items-end gap-3 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="flex h-9 w-40 border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select role</option>
                {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Org Name (optional)</Label>
              <Input value={targetOrgName} onChange={(e) => setTargetOrgName(e.target.value)} placeholder="Hint for recipient" className="text-xs" />
            </div>
            <Button type="submit" size="sm" className="text-xs" disabled={creating || !targetRole}>
              {creating ? 'Creating...' : 'Generate Code'}
            </Button>
          </form>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      )}

      <div className="px-6 py-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Invitations</h2>
        {loading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Loading...</p>
        ) : invitations.length === 0 ? (
          <div className="border border-border px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No invitations yet.</p>
          </div>
        ) : (
          <div className="border border-border">
            <div className="grid grid-cols-[100px_120px_1fr_100px_140px_40px] gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Code</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Role</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Org Hint</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Status</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Created</span>
              <span />
            </div>
            {invitations.map((inv: { id: number; inviteCode: string; targetRole: string; targetOrgName: string | null; usedBy: string | null; expiresAt: number; createdAt: number }) => {
              const status = getInviteStatus(inv);
              return (
                <div key={inv.id} className="grid grid-cols-[100px_120px_1fr_100px_140px_40px] gap-2 px-4 py-3 border-b border-border last:border-b-0 items-center">
                  <span className="text-xs font-mono font-semibold tracking-wider">{inv.inviteCode}</span>
                  <span className="text-xs text-muted-foreground">{inv.targetRole}</span>
                  <span className="text-xs text-muted-foreground truncate">{inv.targetOrgName || '—'}</span>
                  <span><Badge variant={status.variant}>{status.label}</Badge></span>
                  <span className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), 'd MMM yyyy HH:mm')}</span>
                  <span>{!inv.usedBy && inv.expiresAt > Date.now() && <CopyButton text={inv.inviteCode} />}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
