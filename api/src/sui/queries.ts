import { getSuiClient } from './client.js';
import { SuiBatchObject, SuiCustodyRecord, BatchVerificationResult } from '../types/sui.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Verify a batch by its Sui Object ID.
 * This is called millions of times daily by the patient QR scan flow.
 * Reads directly from Sui RPC — no Fabric call needed for public verification.
 */
export async function verifyBatch(suiObjectId: string): Promise<BatchVerificationResult> {
  const client = getSuiClient();

  const object = await client.getObject({
    id: suiObjectId,
    options: { showContent: true, showType: true },
  });

  if (!object.data?.content || object.data.content.dataType !== 'moveObject') {
    throw new Error(`Sui object ${suiObjectId} not found or not a Move object`);
  }

  const fields = object.data.content.fields as Record<string, unknown>;

  const batchObj: SuiBatchObject = {
    objectId: suiObjectId,
    batchId: fields['batch_id'] as string,
    manufacturer: fields['manufacturer'] as string,
    drugName: fields['drug_name'] as string,
    composition: fields['composition'] as string,
    expiryDate: fields['expiry_date'] as string,
    quantity: Number(fields['quantity']),
    fabricDataHash: Buffer.from(fields['fabric_data_hash'] as number[]).toString('hex'),
    recalled: fields['recalled'] as boolean,
    createdAt: Number(fields['created_at']),
  };

  // Fetch custody records (events) for this batch
  const custodyChain = await getCustodyChain(batchObj.batchId);

  return {
    batchId: batchObj.batchId,
    isValid: !batchObj.recalled,
    recalled: batchObj.recalled,
    fabricDataHash: batchObj.fabricDataHash,
    expiryDate: batchObj.expiryDate,
    custodyChain,
    suiObjectId,
  };
}

/**
 * Fetch custody chain for a batch by querying CustodyTransferred events.
 * Returns transfers in chronological order.
 */
export async function getCustodyChain(batchId: string): Promise<SuiCustodyRecord[]> {
  const client = getSuiClient();

  try {
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${config.BRIDGE_PACKAGE_ID}::custody::CustodyTransferred`,
      },
      limit: 50,
    });

    const records: SuiCustodyRecord[] = events.data
      .filter((e) => {
        const fields = e.parsedJson as Record<string, unknown>;
        return fields['batch_id'] === batchId;
      })
      .map((e) => {
        const fields = e.parsedJson as Record<string, unknown>;
        return {
          objectId: e.id.txDigest,
          batchId: fields['batch_id'] as string,
          fromNode: fields['from_node'] as string,
          toNode: fields['to_node'] as string,
          quantity: Number(fields['quantity']),
          fabricDataHash: '',
          sequence: Number(fields['sequence']),
          timestamp: Number(e.timestampMs ?? 0),
        };
      })
      .sort((a, b) => a.sequence - b.sequence);

    return records;
  } catch (err) {
    logger.warn({ err, batchId }, 'Failed to fetch custody chain from Sui');
    return [];
  }
}
