import { z } from 'zod';

const schema = z.object({
  // Fabric
  FABRIC_GATEWAY_ENDPOINT: z.string().default('localhost:7051'),
  FABRIC_TLS_CERT_PATH: z.string().min(1),
  FABRIC_CHANNEL_NAME: z.string().default('dawaTrace-channel'),
  FABRIC_CHAINCODE_NAME: z.string().default('dawaTrace'),
  FABRIC_MSP_ID: z.string().min(1),
  FABRIC_CERT_PATH: z.string().min(1),
  FABRIC_KEY_PATH: z.string().min(1),

  // Sui
  SUI_RPC_URL: z.string().url().default('https://fullnode.devnet.sui.io:443'),
  BRIDGE_PACKAGE_ID: z.string().default('0x0'),

  // API
  API_PORT: z.coerce.number().default(3000),
  API_JWT_SECRET: z.string().min(32),
  API_CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:19006'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
