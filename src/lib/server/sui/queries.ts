import { getSuiClient } from './client';
import { SuiCustodyRecord, BatchVerificationResult } from '../types/sui';
import { config } from '../config';
import { logger } from '../logger';

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

  const custodyChain = await getCustodyChain(fields['batch_id'] as string);

  return {
    batchId: fields['batch_id'] as string,
    isValid: !(fields['recalled'] as boolean),
    recalled: fields['recalled'] as boolean,
    dataHash: Buffer.from(fields['data_hash'] as number[]).toString('hex'),
    expiryDate: fields['expiry_date'] as string,
    custodyChain,
    suiObjectId,
  };
}

export async function getCustodyChain(batchId: string): Promise<SuiCustodyRecord[]> {
  const client = getSuiClient();

  try {
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${config.SUI_PACKAGE_ID}::custody::CustodyTransferred`,
      },
      limit: 50,
    });

    return events.data
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
          dataHash: '',
          sequence: Number(fields['sequence']),
          timestamp: Number(e.timestampMs ?? 0),
        };
      })
      .sort((a, b) => a.sequence - b.sequence);
  } catch (err) {
    logger.warn({ err, batchId }, 'Failed to fetch custody chain from Sui');
    return [];
  }
}
