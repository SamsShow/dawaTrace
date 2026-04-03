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
