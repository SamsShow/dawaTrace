/**
 * Creates DB tables and seeds the CDSCO regulator account.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Idempotent — safe to re-run.
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const ADMIN_NODE_ID = 'CDSCO-REG-001';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_ROLE = 'REGULATOR';
const ADMIN_ORG = 'CDSCO';

async function seed() {
  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      node_id       TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      org_role      TEXT NOT NULL,
      org_name      TEXT NOT NULL,
      drug_license_number TEXT,
      state         TEXT,
      invited_by    TEXT,
      status        TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // CREATE TABLE IF NOT EXISTS does not upgrade existing tables — add any missing columns.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS drug_license_number TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS invitations (
      id              SERIAL PRIMARY KEY,
      invite_code     TEXT UNIQUE NOT NULL,
      inviter_node_id TEXT NOT NULL REFERENCES users(node_id),
      target_role     TEXT NOT NULL,
      target_org_name TEXT,
      expires_at      TIMESTAMPTZ NOT NULL,
      used_by         TEXT,
      used_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Tables created.');

  // Seed admin
  const existing = await sql`SELECT node_id FROM users WHERE node_id = ${ADMIN_NODE_ID}`;
  if (existing.length > 0) {
    console.log(`Admin ${ADMIN_NODE_ID} already exists — skipping.`);
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await sql`
    INSERT INTO users (node_id, password_hash, org_role, org_name)
    VALUES (${ADMIN_NODE_ID}, ${hash}, ${ADMIN_ROLE}, ${ADMIN_ORG})
  `;

  console.log(`Admin created: ${ADMIN_NODE_ID} / ${ADMIN_PASSWORD}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
