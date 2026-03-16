import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { config } from '../config.js';

/**
 * Creates the Ed25519Keypair for the C-DAC bridge relay.
 * The private key is loaded from environment — never hardcoded.
 * In production, use HSM integration instead of raw private key.
 */
export function createBridgeKeypair(): Ed25519Keypair {
  const privateKeyHex = config.BRIDGE_SUI_PRIVATE_KEY;
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  return Ed25519Keypair.fromSecretKey(privateKeyBytes);
}

export function createSuiClient(): SuiClient {
  return new SuiClient({ url: config.SUI_RPC_URL });
}
