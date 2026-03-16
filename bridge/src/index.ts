import { config } from './config.js';
import { logger } from './logger.js';
import { RetryQueue } from './queue.js';
import { BridgeRelay } from './relay.js';
import { startFabricListener } from './listener.js';
import { startHealthServer } from './health.js';

async function main() {
  logger.info('DawaTrace Bridge Relay starting...');
  logger.info({ env: config.NODE_ENV, fabricEndpoint: config.FABRIC_GATEWAY_ENDPOINT }, 'Configuration loaded');

  // Initialize retry queue (Redis-backed in production)
  const queue = new RetryQueue();
  await queue.connect();

  // Initialize relay
  const relay = new BridgeRelay(queue);
  relay.start();

  // Start health server
  startHealthServer(relay, queue);

  // Start Fabric event listener — blocks until connection lost
  logger.info('Connecting to Hyperledger Fabric...');
  await startFabricListener({
    onMint: (event) => relay.handleMintEvent(event),
    onTransfer: (event) => relay.handleTransferEvent(event),
    onRecall: (event) => relay.handleRecallEvent(event),
  });

  logger.error('Fabric listener disconnected — exiting for restart by process manager');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down bridge relay');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down bridge relay');
  process.exit(0);
});

main().catch((err) => {
  logger.error({ err }, 'Fatal error in bridge relay main');
  process.exit(1);
});
