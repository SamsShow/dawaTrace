import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/server/db';

const NODE_ID_MIN = 4;
const NODE_ID_MAX = 20;
const MAX_DUPLICATE_RETRIES = 5;

const VALID_ROLES = ['REGULATOR', 'MANUFACTURER', 'DISTRIBUTOR', 'CHEMIST'];

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

  if (id.length < NODE_ID_MIN) id = id.padEnd(NODE_ID_MIN, '0');
  if (id.length > NODE_ID_MAX) id = id.slice(0, NODE_ID_MAX);

  return id;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgName, orgRole, drugLicenseNumber, state, password } = body as {
    orgName?: string;
    orgRole?: string;
    drugLicenseNumber?: string;
    state?: string;
    password?: string;
  };

  if (!orgName || !orgRole || !password) {
    return NextResponse.json({ error: 'Organization name, role, and password are required' }, { status: 400 });
  }

  if (!VALID_ROLES.includes(orgRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  if ((orgRole === 'MANUFACTURER' || orgRole === 'CHEMIST') && !drugLicenseNumber) {
    return NextResponse.json({ error: 'Drug license number is required for this role' }, { status: 400 });
  }

  // Generate nodeId with duplicate handling
  const countRows = await sql`
    SELECT COUNT(*) as count FROM users WHERE org_role = ${orgRole}
  `;
  const baseSeq = Number(countRows[0].count) + 1;

  let nodeId = '';
  for (let attempt = 0; attempt < MAX_DUPLICATE_RETRIES; attempt++) {
    nodeId = generateNodeId(orgRole, orgName, state || '', baseSeq + attempt);
    const existing = await sql`SELECT node_id FROM users WHERE node_id = ${nodeId}`;
    if (existing.length === 0) break;
    if (attempt === MAX_DUPLICATE_RETRIES - 1) {
      return NextResponse.json({ error: 'Registration conflict — please try again' }, { status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO users (node_id, password_hash, org_role, org_name, drug_license_number, state)
    VALUES (${nodeId}, ${passwordHash}, ${orgRole}, ${orgName}, ${drugLicenseNumber || null}, ${state || null})
  `;

  return NextResponse.json({
    success: true,
    nodeId,
    orgRole,
    message: `Account created. Your Node ID is ${nodeId}. Use it to log in.`,
  });
}
