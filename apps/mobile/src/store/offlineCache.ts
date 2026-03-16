import * as SQLite from 'expo-sqlite';

const DB_NAME = 'dawaTrace.db';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS batch_cache (
      batch_id TEXT PRIMARY KEY,
      drug_name TEXT NOT NULL,
      composition TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      cached_at INTEGER NOT NULL
    );
  `);
  return db;
}

export interface CachedBatch {
  drugName: string;
  composition: string;
  expiryDate: string;
  manufacturer: string;
  quantity: number;
  status: string;
}

/**
 * Writes a batch record to the offline SQLite cache.
 * Called after a successful API fetch so future offline lookups work.
 */
export async function cacheOfflineBatch(batchId: string, batch: CachedBatch): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO batch_cache
     (batch_id, drug_name, composition, expiry_date, manufacturer, quantity, status, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [batchId, batch.drugName, batch.composition, batch.expiryDate, batch.manufacturer, batch.quantity, batch.status ?? 'ACTIVE', Date.now()]
  );
}

/**
 * Reads a cached batch from SQLite.
 * Returns null if not cached or if cache is stale (>24h).
 */
export async function getOfflineBatch(batchId: string): Promise<CachedBatch | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    drug_name: string;
    composition: string;
    expiry_date: string;
    manufacturer: string;
    quantity: number;
    status: string;
    cached_at: number;
  }>('SELECT * FROM batch_cache WHERE batch_id = ?', [batchId]);

  if (!row) return null;

  // Invalidate cache after 24 hours
  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - row.cached_at > maxAge) {
    await db.runAsync('DELETE FROM batch_cache WHERE batch_id = ?', [batchId]);
    return null;
  }

  return {
    drugName: row.drug_name,
    composition: row.composition,
    expiryDate: row.expiry_date,
    manufacturer: row.manufacturer,
    quantity: row.quantity,
    status: row.status,
  };
}
