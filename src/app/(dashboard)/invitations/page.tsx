'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Mail, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useMyInvitations, useCreateInvitation } from '@/hooks/useInvitations';

const ALLOWED_INVITES: Record<string, string[]> = {
  REGULATOR: ['MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST'],
  MANUFACTURER: ['DISTRIBUTOR'],
  DISTRIBUTOR: ['CHEMIST'],
  CHEMIST: [],
};

function getInviteStatus(inv: { usedBy: string | null; expiresAt: number }): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (inv.usedBy) return { label: 'Used', variant: 'default' };
  if (inv.expiresAt < Date.now()) return { label: 'Expired', variant: 'destructive' };
  return { label: 'Pending', variant: 'secondary' };
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Invitations</h1>
      </div>

      {allowedRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Create Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex items-end gap-3 max-w-xl">
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={targetRole} onValueChange={(v) => setTargetRole(v ?? '')}>
                  <SelectTrigger className="w-40 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Your Invitations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading...</p>
          ) : invitations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No invitations yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] uppercase">Code</TableHead>
                  <TableHead className="text-[11px] uppercase">Role</TableHead>
                  <TableHead className="text-[11px] uppercase">Org Hint</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv: { id: number; inviteCode: string; targetRole: string; targetOrgName: string | null; usedBy: string | null; expiresAt: number; createdAt: number }) => {
                  const status = getInviteStatus(inv);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-mono font-semibold tracking-wider">{inv.inviteCode}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.targetRole}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{inv.targetOrgName || '—'}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), 'd MMM yyyy HH:mm')}</TableCell>
                      <TableCell>{!inv.usedBy && inv.expiresAt > Date.now() && <CopyButton text={inv.inviteCode} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
