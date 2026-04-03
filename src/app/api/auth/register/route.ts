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
