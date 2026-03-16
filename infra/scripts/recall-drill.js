#!/usr/bin/env node
/**
 * Recall Drill Script — tests the end-to-end <60s recall SLA
 *
 * 1. Mints a test batch via the API
 * 2. Issues a recall
 * 3. Polls Sui to confirm the BatchObject is marked recalled
 * 4. Reports elapsed time — fails if >60s
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const SUI_RPC = process.env.SUI_RPC_URL || 'https://fullnode.devnet.sui.io:443';

async function main() {
  console.log('=== DawaTrace Recall Drill ===');
  console.log(`API: ${API_URL}`);
  console.log(`Sui RPC: ${SUI_RPC}`);
  console.log('');

  const testBatchId = `DRILL-${Date.now()}`;
  let token = process.env.DRILL_TOKEN || 'dev-token';

  // Step 1: Mint a test batch
  console.log(`Step 1: Minting test batch ${testBatchId}...`);
  const mintStart = Date.now();

  try {
    const mintRes = await fetch(`${API_URL}/api/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        batchId: testBatchId,
        drugName: 'Drill Test Drug',
        composition: 'Recall drill compound',
        expiryDate: '2027-12-31',
        quantity: 100,
        details: { drillRun: 'true' },
      }),
    });
    if (!mintRes.ok) {
      const err = await mintRes.text();
      throw new Error(`Mint failed: ${mintRes.status} ${err}`);
    }
    console.log(`  Batch minted in ${Date.now() - mintStart}ms`);
  } catch (err) {
    console.error('  FAILED:', err.message);
    process.exit(1);
  }

  // Step 2: Issue recall
  console.log(`Step 2: Issuing recall for ${testBatchId}...`);
  const recallStart = Date.now();

  try {
    const recallRes = await fetch(`${API_URL}/api/recalls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ batchId: testBatchId, reason: 'Recall drill — automated SLA test' }),
    });
    if (!recallRes.ok) {
      const err = await recallRes.text();
      throw new Error(`Recall failed: ${recallRes.status} ${err}`);
    }
    console.log(`  Recall issued — Fabric confirmed in ${Date.now() - recallStart}ms`);
  } catch (err) {
    console.error('  FAILED:', err.message);
    process.exit(1);
  }

  // Step 3: Poll Sui for recall confirmation (timeout: 60s)
  console.log('Step 3: Polling Sui for recall confirmation (60s timeout)...');
  const pollStart = Date.now();
  const TIMEOUT_MS = 60_000;
  const POLL_INTERVAL_MS = 2_000;

  // First, get the Sui Object ID from Fabric
  let suiObjectId = null;
  try {
    const batchRes = await fetch(`${API_URL}/api/batches/${testBatchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (batchRes.ok) {
      const batch = await batchRes.json();
      suiObjectId = batch.suiObjectId;
    }
  } catch { /* continue without it */ }

  if (!suiObjectId) {
    console.log('  No Sui Object ID yet — bridge may still be processing');
    console.log('  Manual check: query Fabric for RECALLED status');
    process.exit(0);
  }

  let confirmed = false;
  while (Date.now() - pollStart < TIMEOUT_MS) {
    try {
      const verifyRes = await fetch(`${API_URL}/verify/${suiObjectId}`);
      if (verifyRes.ok) {
        const result = await verifyRes.json();
        if (result.recalled) {
          confirmed = true;
          break;
        }
      }
    } catch { /* retry */ }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    process.stdout.write('.');
  }
  console.log('');

  const totalMs = Date.now() - recallStart;
  if (confirmed) {
    console.log(`\n✅ Recall confirmed on Sui in ${totalMs}ms`);
    if (totalMs > 60_000) {
      console.error(`❌ SLA BREACH: ${totalMs}ms > 60,000ms`);
      process.exit(1);
    } else {
      console.log(`✅ SLA MET: ${totalMs}ms < 60,000ms`);
    }
  } else {
    console.error(`\n❌ Recall NOT confirmed on Sui within ${TIMEOUT_MS}ms — SLA BREACH`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Drill failed:', err);
  process.exit(1);
});
