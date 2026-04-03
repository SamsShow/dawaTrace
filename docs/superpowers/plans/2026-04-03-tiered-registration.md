# Tiered Registration & Role-Based Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded dev credentials with database-backed auth + tiered invitation system where each supply chain level onboards the next.

**Architecture:** Neon Postgres stores users and invitations. Login validates against DB with bcrypt. Registration requires a valid invite code. GraphQL exposes invitation CRUD. REGULATOR role bypasses all restrictions.

**Tech Stack:** Neon serverless driver (`@neondatabase/serverless`), bcrypt (`bcryptjs`), existing Next.js API routes + Apollo GraphQL.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/server/db.ts` | Create | Neon client singleton, exports `sql` tagged template |
| `src/lib/server/config.ts` | Modify | Add `DATABASE_URL` to zod schema |
| `src/app/api/auth/login/route.ts` | Modify | Replace hardcoded creds with DB lookup + bcrypt |
| `src/app/api/auth/register/route.ts` | Create | Registration endpoint using invite codes |
| `src/lib/server/graphql/schema.ts` | Modify | Add Invitation type, myInvitations query, createInvitation mutation |
| `src/lib/server/graphql/resolvers.ts` | Modify | Add invitation resolvers with tier enforcement |
| `src/app/register/page.tsx` | Create | Two-step registration form |
| `src/app/login/page.tsx` | Modify | Add register link |
| `src/app/(dashboard)/invitations/page.tsx` | Create | Invitation management dashboard page |
| `src/hooks/useInvitations.ts` | Create | Apollo hooks for invitations |
| `src/components/Sidebar.tsx` | Modify | Add Invitations nav link for eligible roles |

---

### Task 1: Neon Client + Config

**Files:**
- Create: `src/lib/server/db.ts`
- Modify: `src/lib/server/config.ts`

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs @types/bcryptjs
```

- [ ] **Step 2: Add DATABASE_URL to config schema**

In `src/lib/server/config.ts`, update the zod schema:

```typescript
import { z } from 'zod';

const schema = z.object({
  SUI_RPC_URL: z.string().url().default('https://fullnode.devnet.sui.io:443'),
  SUI_PACKAGE_ID: z.string().default('0x0'),

  API_JWT_SECRET: z.string().default('dev-secret-change-in-production-min32chars'),

  DATABASE_URL: z.string().url(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
```

- [ ] **Step 3: Create Neon client singleton**

Create `src/lib/server/db.ts`:

```typescript
import { neon } from '@neondatabase/serverless';
import { config } from './config';

export const sql = neon(config.DATABASE_URL);
```

- [ ] **Step 4: Verify it compiles**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db.ts src/lib/server/config.ts package.json package-lock.json
git commit -m "feat: add Neon Postgres client and DATABASE_URL config"
```

---

### Task 2: Database-Backed Login

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Rewrite login route to use DB**

Replace the entire contents of `src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/server/db';
import { config } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nodeId, password } = body as { nodeId?: string; password?: string };

  if (!nodeId || !password) {
    return NextResponse.json({ error: 'Node ID and password are required' }, { status: 400 });
  }

  const rows = await sql`
    SELECT node_id, password_hash, org_role, status
    FROM users
    WHERE node_id = ${nodeId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user = rows[0];

  if (user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Account is suspended' }, { status: 403 });
  }

  // Support both bcrypt hashes and legacy plaintext (seeded regulator)
  const isValid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(password, user.password_hash)
    : password === user.password_hash;

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = jwt.sign(
    { nodeId: user.node_id, orgRole: user.org_role },
    config.API_JWT_SECRET,
    { expiresIn: '24h' },
  );

  return NextResponse.json({
    token,
    user: { nodeId: user.node_id, orgRole: user.org_role },
  });
}
```

- [ ] **Step 2: Test login with existing seeded regulator**

Start dev server and test:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"CDSCO-REG-001","password":"admin"}' | python3 -m json.tool
```

Expected: Returns `{ "token": "...", "user": { "nodeId": "CDSCO-REG-001", "orgRole": "REGULATOR" } }`

- [ ] **Step 3: Test invalid credentials**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"FAKE-USER","password":"wrong"}' | python3 -m json.tool
```

Expected: Returns `{ "error": "Invalid credentials" }` with status 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat: replace hardcoded login with database-backed auth"
```

---

### Task 3: Registration Endpoint

**Files:**
- Create: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Create the registration route**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/server/db';

function generateNodeId(orgRole: string, orgName: string, state: string, seq: number): string {
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  const stateShort = (state || 'IND').slice(0, 3).toUpperCase();
  const orgShort = orgName.split(/\s+/)[0].toUpperCase().slice(0, 10);

  switch (orgRole) {
    case 'MANUFACTURER':
      return `${orgShort}-MFG-${pad(seq, 3)}`;
    case 'DISTRIBUTOR':
      return `DIST-${stateShort}-${pad(seq, 3)}`;
    case 'CHEMIST':
      return `CHEM-${stateShort}-${pad(seq, 4)}`;
    default:
      return `USER-${pad(seq, 4)}`;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { inviteCode, orgName, drugLicenseNumber, state, password } = body as {
    inviteCode?: string;
    orgName?: string;
    drugLicenseNumber?: string;
    state?: string;
    password?: string;
  };

  // Validate required fields
  if (!inviteCode || !orgName || !password) {
    return NextResponse.json({ error: 'Invite code, organization name, and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Validate invite code
  const invites = await sql`
    SELECT id, inviter_node_id, target_role, expires_at, used_by
    FROM invitations
    WHERE invite_code = ${inviteCode.toUpperCase()}
  `;

  if (invites.length === 0) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  }

  const invite = invites[0];

  if (invite.used_by) {
    return NextResponse.json({ error: 'Invite code has already been used' }, { status: 400 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 });
  }

  const targetRole = invite.target_role as string;

  // Validate drug license for roles that need it
  if ((targetRole === 'MANUFACTURER' || targetRole === 'CHEMIST') && !drugLicenseNumber) {
    return NextResponse.json({ error: 'Drug license number is required for this role' }, { status: 400 });
  }

  // Generate node ID
  const countRows = await sql`
    SELECT COUNT(*) as count FROM users WHERE org_role = ${targetRole}
  `;
  const seq = Number(countRows[0].count) + 1;
  const nodeId = generateNodeId(targetRole, orgName, state || '', seq);

  // Check for duplicate node_id (unlikely but safe)
  const existing = await sql`SELECT node_id FROM users WHERE node_id = ${nodeId}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Registration conflict — please try again' }, { status: 409 });
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO users (node_id, password_hash, org_role, org_name, drug_license_number, state, invited_by)
    VALUES (${nodeId}, ${passwordHash}, ${targetRole}, ${orgName}, ${drugLicenseNumber || null}, ${state || null}, ${invite.inviter_node_id})
  `;

  // Mark invitation as used
  await sql`
    UPDATE invitations
    SET used_by = ${nodeId}, used_at = NOW()
    WHERE id = ${invite.id}
  `;

  return NextResponse.json({
    success: true,
    nodeId,
    orgRole: targetRole,
    message: `Account created. Your Node ID is ${nodeId}. Use it to log in.`,
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: add registration endpoint with invite code validation"
```

---

### Task 4: GraphQL — Invitation Schema + Resolvers

**Files:**
- Modify: `src/lib/server/graphql/schema.ts`
- Modify: `src/lib/server/graphql/resolvers.ts`

- [ ] **Step 1: Add Invitation types to GraphQL schema**

In `src/lib/server/graphql/schema.ts`, add the following types before the closing backtick of `typeDefs`:

After the existing `enum ReportStatus { ... }` block and before the closing backtick, add:

```graphql
  type Invitation {
    id: Int!
    inviteCode: String!
    inviterNodeId: String!
    targetRole: String!
    targetOrgName: String
    expiresAt: Float!
    usedBy: String
    usedAt: Float
    createdAt: Float!
  }
```

Add to the `type Query` block:

```graphql
    myInvitations: [Invitation!]!
```

Add to the `type Mutation` block:

```graphql
    createInvitation(targetRole: String!, targetOrgName: String): Invitation!
```

- [ ] **Step 2: Add invitation resolvers**

In `src/lib/server/graphql/resolvers.ts`, add the import at the top:

```typescript
import { sql } from '../db';
```

Add a helper function before the `resolvers` object:

```typescript
import crypto from 'crypto';

const INVITE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no O,0,I,1,L

function generateInviteCode(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes).map(b => INVITE_CHARS[b % INVITE_CHARS.length]).join('');
}

const ALLOWED_INVITES: Record<string, string[]> = {
  REGULATOR: ['MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST'],
  MANUFACTURER: ['DISTRIBUTOR'],
  DISTRIBUTOR: ['CHEMIST'],
  CHEMIST: [],
};
```

Add to `resolvers.Query`:

```typescript
    myInvitations: async (_: unknown, _args: unknown, ctx: GqlContext) => {
      if (!ctx.user) return [];
      const rows = await sql`
        SELECT id, invite_code, inviter_node_id, target_role, target_org_name,
               EXTRACT(EPOCH FROM expires_at) * 1000 AS expires_at,
               used_by,
               EXTRACT(EPOCH FROM used_at) * 1000 AS used_at,
               EXTRACT(EPOCH FROM created_at) * 1000 AS created_at
        FROM invitations
        WHERE inviter_node_id = ${ctx.user.nodeId}
        ORDER BY created_at DESC
      `;
      return rows.map(r => ({
        id: r.id,
        inviteCode: r.invite_code,
        inviterNodeId: r.inviter_node_id,
        targetRole: r.target_role,
        targetOrgName: r.target_org_name,
        expiresAt: Number(r.expires_at),
        usedBy: r.used_by,
        usedAt: r.used_at ? Number(r.used_at) : null,
        createdAt: Number(r.created_at),
      }));
    },
```

Add to `resolvers.Mutation`:

```typescript
    createInvitation: async (_: unknown, args: { targetRole: string; targetOrgName?: string }, ctx: GqlContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      const allowed = ALLOWED_INVITES[ctx.user.orgRole] ?? [];
      if (!allowed.includes(args.targetRole)) {
        throw new Error(`${ctx.user.orgRole} cannot invite ${args.targetRole}`);
      }

      const inviteCode = generateInviteCode();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      const rows = await sql`
        INSERT INTO invitations (invite_code, inviter_node_id, target_role, target_org_name, expires_at)
        VALUES (${inviteCode}, ${ctx.user.nodeId}, ${args.targetRole}, ${args.targetOrgName || null}, ${expiresAt.toISOString()})
        RETURNING id,
                  invite_code,
                  inviter_node_id,
                  target_role,
                  target_org_name,
                  EXTRACT(EPOCH FROM expires_at) * 1000 AS expires_at,
                  used_by,
                  EXTRACT(EPOCH FROM used_at) * 1000 AS used_at,
                  EXTRACT(EPOCH FROM created_at) * 1000 AS created_at
      `;

      const r = rows[0];
      return {
        id: r.id,
        inviteCode: r.invite_code,
        inviterNodeId: r.inviter_node_id,
        targetRole: r.target_role,
        targetOrgName: r.target_org_name,
        expiresAt: Number(r.expires_at),
        usedBy: r.used_by,
        usedAt: r.used_at ? Number(r.used_at) : null,
        createdAt: Number(r.created_at),
      };
    },
```

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/graphql/schema.ts src/lib/server/graphql/resolvers.ts
git commit -m "feat: add invitation GraphQL schema and resolvers"
```

---

### Task 5: Registration Page UI

**Files:**
- Create: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Create the registration page**

Create `src/app/register/page.tsx`:

```tsx
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

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), orgName: '_validate_', password: '_validate_only_' }),
      });
      const data = await res.json();

      // We expect a validation error about password length or org name — that's fine.
      // But if the invite code itself is invalid, we get a specific error.
      if (data.error?.includes('Invalid invite code') || data.error?.includes('expired') || data.error?.includes('already been used')) {
        setError(data.error);
        return;
      }

      // Code is valid — we need to get the target role. Let's use a dedicated validate endpoint instead.
      // For simplicity, we'll just move to step 2 and let the final submit handle validation.
      setStep(2);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
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

  // Success state
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
```

- [ ] **Step 2: Add register link to login page**

In `src/app/login/page.tsx`, add after the `</form>` closing tag (inside the `<div className="w-full max-w-xs">` wrapper):

```tsx
        <p className="text-xs text-muted-foreground text-center mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-foreground hover:underline">Register with invite code</Link>
        </p>
```

Add the import at the top of the file:

```tsx
import Link from 'next/link';
```

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds. `/register` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add src/app/register/page.tsx src/app/login/page.tsx
git commit -m "feat: add registration page and register link on login"
```

---

### Task 6: Invitations Dashboard Page

**Files:**
- Create: `src/hooks/useInvitations.ts`
- Create: `src/app/(dashboard)/invitations/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create Apollo hooks for invitations**

Create `src/hooks/useInvitations.ts`:

```typescript
import { gql, useQuery, useMutation } from '@apollo/client';

const MY_INVITATIONS = gql`
  query MyInvitations {
    myInvitations {
      id inviteCode inviterNodeId targetRole targetOrgName
      expiresAt usedBy usedAt createdAt
    }
  }
`;

const CREATE_INVITATION = gql`
  mutation CreateInvitation($targetRole: String!, $targetOrgName: String) {
    createInvitation(targetRole: $targetRole, targetOrgName: $targetOrgName) {
      id inviteCode inviterNodeId targetRole targetOrgName
      expiresAt usedBy usedAt createdAt
    }
  }
`;

export function useMyInvitations() {
  return useQuery(MY_INVITATIONS);
}

export function useCreateInvitation() {
  return useMutation(CREATE_INVITATION, {
    refetchQueries: [{ query: MY_INVITATIONS }],
  });
}
```

- [ ] **Step 2: Create invitations dashboard page**

Create `src/app/(dashboard)/invitations/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Add Invitations link to Sidebar**

In `src/components/Sidebar.tsx`, add the `Mail` import:

```typescript
import { LayoutDashboard, Package, AlertTriangle, BarChart2, Shield, Flag, LogOut, Mail } from 'lucide-react';
```

Update the `NAV` array to add Invitations for eligible roles. Replace the NAV definition:

```typescript
  const canInvite = user?.orgRole === 'REGULATOR' || user?.orgRole === 'MANUFACTURER' || user?.orgRole === 'DISTRIBUTOR';

  const NAV = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/batches', label: t('nav.batches'), icon: Package },
    { to: '/recalls', label: t('nav.recalls'), icon: AlertTriangle },
    { to: '/analytics', label: t('nav.analytics'), icon: BarChart2 },
    ...(canInvite
      ? [{ to: '/invitations', label: 'Invitations', icon: Mail }]
      : []),
    ...(user?.orgRole === 'REGULATOR'
      ? [
          { to: '/reports', label: t('nav.reports', 'Reports'), icon: Flag },
          { to: '/admin', label: t('nav.admin'), icon: Shield },
        ]
      : []),
  ];
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | tail -10
```

Expected: Build succeeds. `/invitations` appears in route list.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useInvitations.ts src/app/\(dashboard\)/invitations/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add invitations dashboard page with create and list"
```

---

### Task 7: End-to-End Smoke Test

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test login with seeded regulator**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"CDSCO-REG-001","password":"admin"}'
```

Expected: Returns JWT token.

- [ ] **Step 3: Create an invitation via GraphQL**

Use the JWT from step 2:

```bash
TOKEN="<paste token from step 2>"
curl -s -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { createInvitation(targetRole: \"MANUFACTURER\", targetOrgName: \"Sun Pharma\") { inviteCode targetRole expiresAt } }"}'
```

Expected: Returns `{ "data": { "createInvitation": { "inviteCode": "ABC123", ... } } }`

- [ ] **Step 4: Register a new manufacturer**

Use the invite code from step 3:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"inviteCode":"<code>","orgName":"Sun Pharma","drugLicenseNumber":"DL-MH-2024-001","state":"Maharashtra","password":"sunpharma123"}'
```

Expected: Returns `{ "success": true, "nodeId": "SUN-MFG-001", "orgRole": "MANUFACTURER" }`

- [ ] **Step 5: Login as the new manufacturer**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"SUN-MFG-001","password":"sunpharma123"}'
```

Expected: Returns JWT with `orgRole: "MANUFACTURER"`.

- [ ] **Step 6: Verify tier enforcement — manufacturer can only invite distributors**

```bash
TOKEN2="<paste manufacturer token>"
curl -s -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"query":"mutation { createInvitation(targetRole: \"REGULATOR\") { inviteCode } }"}'
```

Expected: Returns error "MANUFACTURER cannot invite REGULATOR".

- [ ] **Step 7: Test UI flow in browser**

1. Go to `http://localhost:3000/login` — verify "Register with invite code" link appears
2. Go to `http://localhost:3000/register` — verify invite code form appears
3. Login as CDSCO-REG-001 → navigate to Invitations → create an invite → copy code
4. Logout → go to /register → use the code → fill form → verify account is created
5. Login with new account → verify dashboard shows role-appropriate nav

- [ ] **Step 8: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```

---

### Task 8: Hash the Seeded Regulator Password

**Files:** None (database migration)

- [ ] **Step 1: Update the seeded regulator password to bcrypt**

Run this once to hash the plaintext password:

```bash
node -e "
const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const hash = await bcrypt.hash('admin', 10);
  await sql\`UPDATE users SET password_hash = \${hash} WHERE node_id = 'CDSCO-REG-001'\`;
  console.log('Updated CDSCO-REG-001 password to bcrypt hash');
})().catch(e => console.error(e.message));
"
```

Expected: Prints "Updated CDSCO-REG-001 password to bcrypt hash".

- [ ] **Step 2: Verify login still works**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"CDSCO-REG-001","password":"admin"}'
```

Expected: Still returns JWT.

- [ ] **Step 3: Remove legacy plaintext fallback from login route**

In `src/app/api/auth/login/route.ts`, replace:

```typescript
  // Support both bcrypt hashes and legacy plaintext (seeded regulator)
  const isValid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(password, user.password_hash)
    : password === user.password_hash;
```

With:

```typescript
  const isValid = await bcrypt.compare(password, user.password_hash);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "chore: hash seeded regulator password, remove plaintext fallback"
```
