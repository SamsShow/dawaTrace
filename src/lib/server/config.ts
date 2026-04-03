import { z } from 'zod';

const schema = z.object({
  SUI_RPC_URL: z.string().url().default('https://fullnode.devnet.sui.io:443'),
  SUI_PACKAGE_ID: z.string().default('0x0'),

  API_JWT_SECRET: z.string().default('dev-secret-change-in-production-min32chars'),

  DATABASE_URL: z.string().url(),

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
