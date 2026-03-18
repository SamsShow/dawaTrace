import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { logger } from './logger.js';
import { RetryQueue, QueuedEvent } from './queue.js';
import { MintEventPayload, TransferEventPayload, RecallEventPayload } from './listener.js';
import {
  buildMintBatchTx,
  buildMarkRecalledTx,
  buildAnchorHashTx,
  buildRecordTransferTx,
} from './sui/transactions.js';
import { createBridgeKeypair, createSuiClient } from './sui/signer.js';
import {
  eventProcessingDuration,
  recallSLADuration,
  eventsProcessed,
  deadLetterCount,
  suiTxTotal,
  suiTxDuration,
} from './metrics.js';

// In-memory map: Fabric batchId → Sui Object ID
// In production this should be persisted (Redis or DB)
const batchObjectIdCache = new Map<string, string>();

/**
 * BridgeRelay orchestrates the Fabric→Sui hash anchoring.
 *
 * Architecture:
 * - Mint/Transfer events → NORMAL priority queue
 * - Recall events → URGENT priority queue (must land on Sui within 60s)
 *
 * The relay processes the queue in a tight loop, always draining URGENT first.
 * Failed transactions are retried with exponential backoff.
 * After 5 failures, events are dead-lettered to ./dead-letter/ JSONL files.
 */
export class BridgeRelay {
  private keypair: Ed25519Keypair;
  private suiClient: SuiClient;
  private queue: RetryQueue;
  private running: boolean = false;
  private lastAnchoredBlock: bigint = 0n;

  constructor(queue: RetryQueue) {
    this.keypair = createBridgeKeypair();
    this.suiClient = createSuiClient();
    this.queue = queue;
    logger.info(
      { address: this.keypair.getPublicKey().toSuiAddress() },
      'Bridge relay initialized with Sui address'
    );
  }

  /** Called when a Fabric MintEvent is received. */
  async handleMintEvent(event: MintEventPayload): Promise<void> {
    logger.info({ batchId: event.batchId }, 'MintEvent received — queuing Sui BatchObject creation');
    await this.queue.enqueue({
      id: uuidv4(),
      priority: 'NORMAL',
      eventType: 'MintEvent',
      payload: event as unknown as Record<string, unknown>,
    });
  }

  /** Called when a Fabric TransferEvent is received. */
  async handleTransferEvent(event: TransferEventPayload): Promise<void> {
    logger.info({ batchId: event.batchId }, 'TransferEvent received — queuing hash anchor');
    await this.queue.enqueue({
      id: uuidv4(),
      priority: 'NORMAL',
      eventType: 'TransferEvent',
      payload: event as unknown as Record<string, unknown>,
    });
  }

  /**
   * Called when a Fabric RecallEvent is received.
   * Routes to URGENT queue — must complete within 60 seconds.
   */
  async handleRecallEvent(event: RecallEventPayload): Promise<void> {
    logger.warn({ batchId: event.batchId }, 'RecallEvent received — URGENT queue, 60s SLA');
    await this.queue.enqueue({
      id: uuidv4(),
      priority: 'URGENT',
      eventType: 'RecallEvent',
      payload: event as unknown as Record<string, unknown>,
    });
  }

  /** Start the relay processing loop. */
  start(): void {
    this.running = true;
    logger.info('Bridge relay processing loop started');
    this.processLoop().catch((err) => {
      logger.error({ err }, 'Fatal error in relay processing loop');
      process.exit(1);
    });
  }

  stop(): void {
    this.running = false;
  }

  getLastAnchoredBlock(): bigint {
    return this.lastAnchoredBlock;
  }

  /** Main processing loop — runs continuously, draining URGENT before NORMAL. */
  private async processLoop(): Promise<void> {
    while (this.running) {
      const event = await this.queue.dequeue();

      if (!event) {
        // Nothing ready — wait 100ms before checking again
        await sleep(100);
        continue;
      }

      try {
        await this.processEvent(event);
        eventsProcessed.inc({ event_type: event.eventType, result: 'success' });
      } catch (err) {
        eventsProcessed.inc({ event_type: event.eventType, result: 'error' });
        logger.error({ err, eventId: event.id, eventType: event.eventType }, 'Failed to process event');
        await this.queue.requeueWithBackoff(event, err as Error);
      }
    }
  }

  private async processEvent(event: QueuedEvent): Promise<void> {
    const startMs = Date.now();

    switch (event.eventType) {
      case 'MintEvent':
        await this.processMintEvent(event.payload as unknown as MintEventPayload);
        break;
      case 'TransferEvent':
        await this.processTransferEvent(event.payload as unknown as TransferEventPayload);
        break;
      case 'RecallEvent':
        await this.processRecallEvent(event.payload as unknown as RecallEventPayload);
        break;
      default:
        logger.warn({ eventType: event.eventType }, 'Unknown event type — discarding');
    }

    const elapsedMs = Date.now() - startMs;
    const elapsedSeconds = elapsedMs / 1000;

    // Record event processing duration
    eventProcessingDuration.observe({ event_type: event.eventType }, elapsedSeconds);

    // Record recall SLA metric separately for SLA tracking
    if (event.eventType === 'RecallEvent') {
      recallSLADuration.observe(elapsedSeconds);
    }

    logger.info({ eventId: event.id, eventType: event.eventType, elapsedMs }, 'Event processed');

    if (event.eventType === 'RecallEvent' && elapsedMs > 30_000) {
      logger.warn({ elapsedMs }, 'Recall anchor took >30s — SLA at risk');
    }
  }

  private async processMintEvent(event: MintEventPayload): Promise<void> {
    // For prototype: use a placeholder manufacturer address
    // In production: resolve from Fabric MSP identity registry
    const manufacturerAddress = this.keypair.getPublicKey().toSuiAddress();

    const tx = buildMintBatchTx({
      batchId: event.batchId,
      manufacturer: event.manufacturerId,
      drugName: event.drugName,
      composition: event.composition,
      expiryDate: event.expiryDate,
      quantity: event.quantity,
      fabricDataHash: event.dataHash,
      manufacturerAddress,
      capabilityId: config.BRIDGE_CAPABILITY_ID,
    });

    const result = await this.signAndExecute(tx);
    logger.info({ batchId: event.batchId, digest: result.digest }, 'Batch minted on Sui');

    // Cache the Sui object ID for future recall/transfer operations
    // In production: extract from result.objectChanges
    if (result.objectChanges) {
      const created = result.objectChanges.find(
        (c) => c.type === 'created' && 'objectType' in c && c.objectType.includes('BatchObject')
      );
      if (created && 'objectId' in created) {
        batchObjectIdCache.set(event.batchId, created.objectId);
        logger.info({ batchId: event.batchId, suiObjectId: created.objectId }, 'BatchObject ID cached');
      }
    }
  }

  private async processTransferEvent(event: TransferEventPayload): Promise<void> {
    const batchObjectId = batchObjectIdCache.get(event.batchId);
    if (!batchObjectId) {
      logger.warn({ batchId: event.batchId }, 'No Sui object ID cached for batch — skipping anchor hash');
      return;
    }

    const tx = buildAnchorHashTx({
      batchObjectId,
      newHash: event.dataHash,
      capabilityId: config.BRIDGE_CAPABILITY_ID,
    });

    const result = await this.signAndExecute(tx);
    logger.info({ batchId: event.batchId, digest: result.digest }, 'Transfer hash anchored on Sui');
  }

  private async processRecallEvent(event: RecallEventPayload): Promise<void> {
    const recallStartMs = Date.now();

    const batchObjectId = batchObjectIdCache.get(event.batchId);
    if (!batchObjectId) {
      logger.error({ batchId: event.batchId }, 'No Sui object ID for recall — cannot mark recalled. Dead-lettering.');
      throw new Error(`No Sui object ID cached for batch ${event.batchId}`);
    }

    const tx = buildMarkRecalledTx({
      batchObjectId,
      capabilityId: config.BRIDGE_CAPABILITY_ID,
    });

    const result = await this.signAndExecute(tx);
    const elapsedMs = Date.now() - recallStartMs;

    logger.warn(
      { batchId: event.batchId, digest: result.digest, elapsedMs },
      `Recall anchored on Sui in ${elapsedMs}ms`
    );

    if (elapsedMs > 60_000) {
      logger.error({ batchId: event.batchId, elapsedMs }, 'RECALL SLA BREACH: >60s');
    }
  }

  private async signAndExecute(tx: Transaction) {
    tx.setSender(this.keypair.getPublicKey().toSuiAddress());
    tx.setGasBudget(10_000_000); // 0.01 SUI

    const bytes = await tx.build({ client: this.suiClient });
    const { signature } = await this.keypair.signTransaction(bytes);

    const endTimer = suiTxDuration.startTimer();
    try {
      const result = await this.suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      suiTxTotal.inc({ status: 'success' });
      endTimer();
      return result;
    } catch (err) {
      suiTxTotal.inc({ status: 'failure' });
      endTimer();
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
