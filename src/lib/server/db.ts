import { neon } from '@neondatabase/serverless';
import { config } from './config';

export const sql = neon(config.DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
  },
});
