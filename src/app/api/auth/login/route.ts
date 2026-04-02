import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { config } from '@/lib/server/config';

// Dev-mode credential map. In production, validate against an identity provider.
const DEV_CREDENTIALS: Record<string, { password: string; orgRole: string }> = {
  'CDSCO-REG-001': { password: 'admin', orgRole: 'REGULATOR' },
  'SUN-PHARMA-MFG-001': { password: 'admin', orgRole: 'MANUFACTURER' },
  'DIST-DELHI-002': { password: 'admin', orgRole: 'DISTRIBUTOR' },
  'CHEM-MUM-0091': { password: 'admin', orgRole: 'CHEMIST' },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nodeId, password } = body as { nodeId?: string; password?: string };

  if (!nodeId || !password) {
    return NextResponse.json({ error: 'Node ID and password are required' }, { status: 400 });
  }

  const cred = DEV_CREDENTIALS[nodeId];
  if (!cred || cred.password !== password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = jwt.sign(
    { nodeId, orgRole: cred.orgRole },
    config.API_JWT_SECRET,
    { expiresIn: '24h' },
  );

  return NextResponse.json({ token, user: { nodeId, orgRole: cred.orgRole } });
}
