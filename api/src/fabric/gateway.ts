import { connect, Gateway, Network, Contract } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { config } from '../config.js';
import { logger } from '../logger.js';

let gateway: Gateway | null = null;
let grpcClient: grpc.Client | null = null;

/**
 * Creates and caches the Fabric Gateway connection.
 * Reuses the connection across requests.
 */
export async function getFabricGateway(): Promise<Gateway> {
  if (gateway) return gateway;

  const tlsCert = fs.readFileSync(config.FABRIC_TLS_CERT_PATH);
  const credentials = grpc.credentials.createSsl(tlsCert);

  grpcClient = new grpc.Client(config.FABRIC_GATEWAY_ENDPOINT, credentials, {
    'grpc.keepalive_time_ms': 120_000,
    'grpc.keepalive_timeout_ms': 20_000,
    'grpc.keepalive_permit_without_calls': 1,
  });

  const certPem = fs.readFileSync(config.FABRIC_CERT_PATH).toString();
  const keyFiles = fs.readdirSync(config.FABRIC_KEY_PATH);
  const keyPem = fs.readFileSync(`${config.FABRIC_KEY_PATH}/${keyFiles[0]}`).toString();

  gateway = connect({
    client: grpcClient,
    identity: {
      mspId: config.FABRIC_MSP_ID,
      credentials: Buffer.from(certPem),
    },
    signer: {
      sign: async (digest) => {
        const key = crypto.createPrivateKey(keyPem);
        return crypto.sign(null, Buffer.from(digest), key);
      },
    },
    evaluateOptions: () => ({ deadline: Date.now() + 5_000 }),
    endorseOptions: () => ({ deadline: Date.now() + 30_000 }),
    submitOptions: () => ({ deadline: Date.now() + 30_000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
  });

  logger.info({ endpoint: config.FABRIC_GATEWAY_ENDPOINT }, 'Fabric Gateway connected');
  return gateway;
}

export async function getFabricContract(): Promise<Contract> {
  const gw = await getFabricGateway();
  const network: Network = gw.getNetwork(config.FABRIC_CHANNEL_NAME);
  return network.getContract(config.FABRIC_CHAINCODE_NAME);
}

export function closeFabricGateway(): void {
  gateway?.close();
  grpcClient?.close();
  gateway = null;
  grpcClient = null;
}
