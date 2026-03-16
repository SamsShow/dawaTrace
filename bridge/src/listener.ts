import { connect, Contract, Network } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

// Fabric event type names — must match events.go constants exactly
export const FABRIC_EVENTS = {
  MINT: 'MintEvent',
  TRANSFER: 'TransferEvent',
  DISPENSE: 'DispenseEvent',
  RECALL: 'RecallEvent',
  CHEMIST_FLAGGED: 'ChemistFlaggedEvent',
} as const;

export interface MintEventPayload {
  batchId: string;
  manufacturerId: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  dataHash: string;
  timestamp: number;
}

export interface TransferEventPayload {
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  dataHash: string;
  timestamp: number;
}

export interface RecallEventPayload {
  batchId: string;
  regulatorId: string;
  reason: string;
  dataHash: string;
  timestamp: number;
  urgent: boolean;
}

export type FabricEventHandler = {
  onMint: (payload: MintEventPayload) => Promise<void>;
  onTransfer: (payload: TransferEventPayload) => Promise<void>;
  onRecall: (payload: RecallEventPayload) => Promise<void>;
};

/**
 * Connects to Hyperledger Fabric and subscribes to chaincode events.
 * Dispatches typed events to the relay handler.
 */
export async function startFabricListener(handlers: FabricEventHandler): Promise<void> {
  const tlsCert = fs.readFileSync(config.FABRIC_TLS_CERT_PATH);
  const credentials = grpc.credentials.createSsl(tlsCert);

  const client = new grpc.Client(config.FABRIC_GATEWAY_ENDPOINT, credentials);

  // Load identity from file system
  const certPem = fs.readFileSync(config.FABRIC_CERT_PATH).toString();
  const keyFiles = fs.readdirSync(config.FABRIC_KEY_PATH);
  const keyPem = fs.readFileSync(`${config.FABRIC_KEY_PATH}/${keyFiles[0]}`).toString();

  const gateway = connect({
    client,
    identity: { mspId: config.FABRIC_MSP_ID, credentials: Buffer.from(certPem) },
    signer: {
      sign: async (digest) => {
        const key = crypto.createPrivateKey(keyPem);
        return crypto.sign(null, Buffer.from(digest), key);
      },
    },
  });

  try {
    const network: Network = gateway.getNetwork(config.FABRIC_CHANNEL_NAME);
    const contract: Contract = network.getContract(config.FABRIC_CHAINCODE_NAME);

    logger.info('Subscribing to Fabric chaincode events...');
    const events = await contract.getChaincodeEvents(0n); // Start from latest block

    for await (const event of events) {
      const payloadStr = Buffer.from(event.payload).toString('utf-8');
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        logger.warn({ eventName: event.eventName }, 'Failed to parse event payload — skipping');
        continue;
      }

      logger.debug({ eventName: event.eventName, blockNumber: event.blockNumber.toString() }, 'Fabric event received');

      try {
        switch (event.eventName) {
          case FABRIC_EVENTS.MINT:
            await handlers.onMint(payload as unknown as MintEventPayload);
            break;
          case FABRIC_EVENTS.TRANSFER:
            await handlers.onTransfer(payload as unknown as TransferEventPayload);
            break;
          case FABRIC_EVENTS.RECALL:
            await handlers.onRecall(payload as unknown as RecallEventPayload);
            break;
          default:
            // DispenseEvent and ChemistFlaggedEvent don't need Sui anchoring
            logger.debug({ eventName: event.eventName }, 'Event not requiring Sui anchor — skipped');
        }
      } catch (err) {
        logger.error({ err, eventName: event.eventName }, 'Error dispatching Fabric event');
      }
    }
  } finally {
    gateway.close();
    client.close();
  }
}
