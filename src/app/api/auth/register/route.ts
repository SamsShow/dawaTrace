import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/server/db';

const NODE_ID_MAX = 20;
const MAX_DUPLICATE_RETRIES = 5;

function generateNodeId(orgRole: string, orgName: string, state: string, seq: number): string {
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  const stateShort = (state || 'IND').slice(0, 3).toUpperCase();
  const orgShort = orgName.split(/\s+/)[0].toUpperCase().slice(0, 10);

  let id: string;
  switch (orgRole) {
    case 'REGULATOR':
      id = `${orgShort}-REG-${pad(seq, 3)}`;
      break;
    case 'MANUFACTURER':
      id = `${orgShort}-MFG-${pad(seq, 3)}`;
      break;
    case 'DISTRIBUTOR':
      id = `DIST-${stateShort}-${pad(seq, 3)}`;
      break;
    case 'CHEMIST':
      id = `CHEM-${stateShort}-${pad(seq, 4)}`;
      break;
    default:
      id = `USER-${pad(seq, 4)}`;
  }

  if (id.length > NODE_ID_MAX) id = id.slice(0, NODE_ID_MAX);
  return id;
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
    WHERE invite_code = ${inviteCode.toUpperCase().trim()}
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

  // Generate nodeId with duplicate handling
  const countRows = await sql`
    SELECT COUNT(*) as count FROM users WHERE org_role = ${targetRole}
  `;
  const baseSeq = Number(countRows[0].count) + 1;

  let nodeId = '';
  for (let attempt = 0; attempt < MAX_DUPLICATE_RETRIES; attempt++) {
    nodeId = generateNodeId(targetRole, orgName, state || '', baseSeq + attempt);
    const existing = await sql`SELECT node_id FROM users WHERE node_id = ${nodeId}`;
    if (existing.length === 0) break;
    if (attempt === MAX_DUPLICATE_RETRIES - 1) {
      return NextResponse.json({ error: 'Registration conflict — please try again' }, { status: 409 });
    }
  }

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
