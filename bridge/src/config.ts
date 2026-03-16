import { z } from 'zod';

const schema = z.object({
  // Fabric connection
  FABRIC_GATEWAY_ENDPOINT: z.string().min(1),
  FABRIC_TLS_CERT_PATH: z.string().min(1),
  FABRIC_CHANNEL_NAME: z.string().default('dawaTrace-channel'),
  FABRIC_CHAINCODE_NAME: z.string().default('dawaTrace'),
  FABRIC_MSP_ID: z.string().min(1),
  FABRIC_CERT_PATH: z.string().min(1),
  FABRIC_KEY_PATH: z.string().min(1),

  // Sui connection
  SUI_RPC_URL: z.string().url().default('https://fullnode.devnet.sui.io:443'),
  BRIDGE_SUI_PRIVATE_KEY: z.string().min(1),
  BRIDGE_CAPABILITY_ID: z.string().min(1),
  BRIDGE_PACKAGE_ID: z.string().min(1),

  // Redis retry queue
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Bridge health server
  BRIDGE_HEALTH_PORT: z.coerce.number().default(4001),

  // Operational
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
