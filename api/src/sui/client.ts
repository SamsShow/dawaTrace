import { SuiClient } from '@mysten/sui/client';
import { config } from '../config.js';

let suiClient: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({ url: config.SUI_RPC_URL });
  }
  return suiClient;
}
