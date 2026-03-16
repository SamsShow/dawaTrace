import { Transaction } from '@mysten/sui/transactions';
import { config } from '../config.js';

/**
 * Builds a PTB (Programmable Transaction Block) to mint a Sui BatchObject.
 * Called when bridge receives a MintEvent from Fabric.
 */
export function buildMintBatchTx(params: {
  batchId: string;
  manufacturer: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  fabricDataHash: string; // hex string
  manufacturerAddress: string;
  capabilityId: string;
}): Transaction {
  const tx = new Transaction();

  const capObject = tx.object(params.capabilityId);
  const hashBytes = tx.pure.vector('u8', Buffer.from(params.fabricDataHash, 'hex'));

  tx.moveCall({
    target: `${config.BRIDGE_PACKAGE_ID}::batch::mint_batch`,
    arguments: [
      tx.pure.string(params.batchId),
      tx.pure.string(params.manufacturer),
      tx.pure.string(params.drugName),
      tx.pure.string(params.composition),
      tx.pure.string(params.expiryDate),
      tx.pure.u64(params.quantity),
      hashBytes,
      tx.pure.address(params.manufacturerAddress),
      capObject,
    ],
  });

  return tx;
}

/**
 * Builds a PTB to mark a Sui BatchObject as recalled.
 * Called when bridge receives a RecallEvent from Fabric.
 * URGENT — must execute within 60s of Fabric recall commit.
 */
export function buildMarkRecalledTx(params: {
  batchObjectId: string;
  capabilityId: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.BRIDGE_PACKAGE_ID}::batch::mark_recalled`,
    arguments: [
      tx.object(params.batchObjectId),
      tx.object(params.capabilityId),
    ],
  });

  return tx;
}

/**
 * Builds a PTB to anchor an updated data hash on the Sui BatchObject.
 * Called on TransferEvents to maintain Fabric↔Sui hash parity.
 */
export function buildAnchorHashTx(params: {
  batchObjectId: string;
  newHash: string; // hex string
  capabilityId: string;
}): Transaction {
  const tx = new Transaction();

  const hashBytes = tx.pure.vector('u8', Buffer.from(params.newHash, 'hex'));

  tx.moveCall({
    target: `${config.BRIDGE_PACKAGE_ID}::batch::anchor_hash`,
    arguments: [
      tx.object(params.batchObjectId),
      hashBytes,
      tx.object(params.capabilityId),
    ],
  });

  return tx;
}

/**
 * Builds a PTB to record a custody transfer on Sui.
 */
export function buildRecordTransferTx(params: {
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  fabricDataHash: string;
  sequence: number;
  capabilityId: string;
}): Transaction {
  const tx = new Transaction();

  const hashBytes = tx.pure.vector('u8', Buffer.from(params.fabricDataHash, 'hex'));

  tx.moveCall({
    target: `${config.BRIDGE_PACKAGE_ID}::custody::record_transfer`,
    arguments: [
      tx.pure.string(params.batchId),
      tx.pure.string(params.fromNode),
      tx.pure.string(params.toNode),
      tx.pure.u64(params.quantity),
      hashBytes,
      tx.pure.u64(params.sequence),
      tx.object(params.capabilityId),
    ],
  });

  return tx;
}

/**
 * Builds a PTB to award DawaPoints to a whistleblower.
 */
export function buildAwardPointsTx(params: {
  reporter: string;
  batchId: string;
  amount: number;
  capabilityId: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.BRIDGE_PACKAGE_ID}::dawa_points::award_points`,
    arguments: [
      tx.pure.address(params.reporter),
      tx.pure.string(params.batchId),
      tx.pure.u64(params.amount),
      tx.object(params.capabilityId),
    ],
  });

  return tx;
}
