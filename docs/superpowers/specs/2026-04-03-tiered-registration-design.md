# Tiered Registration & Role-Based Auth — Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Replace the hardcoded dev credentials with a database-backed auth system using Neon Postgres. Implement tiered onboarding where each supply chain level invites the next: CDSCO → manufacturers → distributors → chemists. Single platform, role-based views.

## Database

**Provider:** Neon Postgres (project: `dawatrace`, region: `aws-ap-southeast-1`)
**Driver:** `@neondatabase/serverless`
**Connection:** `DATABASE_URL` env var

### Schema (already created)

```sql
-- users: all supply chain participants
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  node_id VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  org_role VARCHAR(32) NOT NULL CHECK (org_role IN ('REGULATOR', 'MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST')),
  org_name VARCHAR(255) NOT NULL,
  drug_license_number VARCHAR(64),
  state VARCHAR(64),
  invited_by VARCHAR(64) REFERENCES users(node_id),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- invitations: invite codes for tiered onboarding
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  invite_code VARCHAR(64) UNIQUE NOT NULL,
  inviter_node_id VARCHAR(64) NOT NULL REFERENCES users(node_id),
  target_role VARCHAR(32) NOT NULL CHECK (target_role IN ('MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST')),
  target_org_name VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by VARCHAR(64) REFERENCES users(node_id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Seed data:** `CDSCO-REG-001` pre-seeded as REGULATOR (already inserted).

## Invitation Rules

| Inviter Role | Can Invite |
|-------------|-----------|
| REGULATOR | MANUFACTURER, DISTRIBUTOR, CHEMIST (any role) |
| MANUFACTURER | DISTRIBUTOR |
| DISTRIBUTOR | CHEMIST |
| CHEMIST | Nobody |

REGULATOR bypasses all role restrictions — can perform any action (mint, transfer, recall, invite any role) for testing purposes.

## Node ID Generation

Auto-generated at registration. Format by role:
- MANUFACTURER: `{ORG_SHORT}-MFG-{seq}` (e.g., `CIPLA-MFG-002`)
- DISTRIBUTOR: `DIST-{STATE_SHORT}-{seq}` (e.g., `DIST-DEL-003`)
- CHEMIST: `CHEM-{STATE_SHORT}-{seq}` (e.g., `CHEM-MUM-0092`)

`{ORG_SHORT}` = first word of org name, uppercased, max 10 chars.
`{STATE_SHORT}` = first 3 chars of state, uppercased.
`{seq}` = zero-padded count of existing users with that role prefix + 1.

## Registration Flow

1. Inviter logs in → navigates to invite section in dashboard → selects target role → submits
2. Server generates 6-character alphanumeric invite code (uppercase, no ambiguous chars like O/0/I/1), stores in `invitations` table with 72h expiry
3. Inviter shares code out-of-band (email, phone, etc.)
4. Recipient goes to `/register` → enters invite code
5. Server validates: code exists, not expired, not used → returns target role info
6. Recipient fills in: org name, drug license number, state, password, confirm password
7. Server: hashes password (bcrypt), generates node_id, creates user, marks invitation as used
8. Recipient redirected to `/login` with success message

## API Changes

### `/api/auth/login` (modify existing)

Replace hardcoded `DEV_CREDENTIALS` map with database lookup:
1. Query `users` table by `node_id`
2. Compare bcrypt hash of submitted password against `password_hash`
3. Check user `status` is `ACTIVE`
4. Return JWT with `{ nodeId, orgRole }` (same format as current)

### `/api/auth/register` (new)

**POST body:**
```json
{
  "inviteCode": "ABC123",
  "orgName": "Sun Pharma",
  "drugLicenseNumber": "DL-MH-2024-001234",
  "state": "Maharashtra",
  "password": "securepassword"
}
```

**Response:** `{ success: true, nodeId: "SUN-P-MFG-002" }`

**Validations:**
- Invite code exists, not expired, not already used
- Password min 8 chars
- Org name required
- Drug license number required for MANUFACTURER and CHEMIST, optional for DISTRIBUTOR

### GraphQL Changes

**New types:**
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

extend type Query {
  myInvitations: [Invitation!]!
}

extend type Mutation {
  createInvitation(targetRole: String!, targetOrgName: String): Invitation!
}
```

**Resolver logic for `createInvitation`:**
1. Check `ctx.user` exists (authenticated)
2. Enforce invitation rules (REGULATOR can invite any, MFG→DIST, DIST→CHEM, CHEM→none)
3. Generate invite code
4. Insert into `invitations` table with 72h expiry
5. Return created invitation

## UI Changes

### `/register` (new page)

Two-step form:
1. **Step 1:** Enter invite code → validate → show target role
2. **Step 2:** Fill org name, drug license, state (dropdown of Indian states), password, confirm password → submit

Same minimal styling as `/login` page. No sidebar, no header nav — just centered form.

### `/login` (modify)

Add link below form: "Don't have an account? Register with invite code" → links to `/register`

### Dashboard Sidebar (modify)

Add "Invitations" link for REGULATOR, MANUFACTURER, DISTRIBUTOR roles. Not shown for CHEMIST.

### Dashboard Invitations Section (new)

Accessible from sidebar. Shows:
- "Create Invitation" form: target role dropdown (filtered by invitation rules), optional org name hint
- Table of existing invitations: code, target role, status (pending/used/expired), created date
- Copy-to-clipboard button for invite codes

## Files to Create/Modify

### New files:
- `src/lib/server/db.ts` — Neon client singleton, exports `sql` tagged template
- `src/app/api/auth/register/route.ts` — registration endpoint
- `src/app/register/page.tsx` — registration form UI
- `src/app/(dashboard)/invitations/page.tsx` — invitation management UI
- `src/hooks/useInvitations.ts` — Apollo hooks for invitation queries/mutations

### Modified files:
- `src/app/api/auth/login/route.ts` — replace hardcoded creds with DB lookup
- `src/lib/server/graphql/schema.ts` — add Invitation type, query, mutation
- `src/lib/server/graphql/resolvers.ts` — add invitation resolvers
- `src/lib/server/config.ts` — add DATABASE_URL to zod schema
- `src/app/login/page.tsx` — add register link
- `src/components/Sidebar.tsx` — add Invitations link
- `.env.example` — add DATABASE_URL (already done)

## Security

- Passwords hashed with bcrypt (cost factor 10)
- Invite codes: 6 chars, alphanumeric, uppercase, no ambiguous chars (exclude O, 0, I, 1, L)
- Invite codes expire after 72 hours
- Single-use: marked as used after registration
- JWT unchanged: signed with API_JWT_SECRET, 24h expiry
- REGULATOR god-mode is intentional for demo/testing — document clearly

## What stays the same

- JWT format and Apollo Client auth header pattern
- localStorage token storage via `src/lib/auth.ts`
- All existing dashboard pages (batches, recalls, analytics, admin, reports)
- GraphQL query/mutation patterns for batches, recalls, etc.
- Sui integration (queries, contract structure)
