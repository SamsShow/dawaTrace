import * as SQLite from 'expo-sqlite';

const DB_NAME = 'dawaTrace.db';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      patient_hash TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
  return db;
}

export interface DispenseQueueItem {
  batchId: string;
  quantity: number;
  patientHash: string;
  timestamp: number;
}

/**
 * Adds a dispense record to the offline sync queue.
 * Called when the chemist dispenses offline. Flushed by useOfflineSync on reconnect.
 */
export async function addToSyncQueue(item: DispenseQueueItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_queue (batch_id, quantity, patient_hash, timestamp) VALUES (?, ?, ?, ?)',
    [item.batchId, item.quantity, item.patientHash, item.timestamp]
  );
}

/**
 * Returns all pending (unsynced) items in the queue.
 */
export async function getPendingItems(): Promise<Array<DispenseQueueItem & { id: number }>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    batch_id: string;
    quantity: number;
    patient_hash: string;
    timestamp: number;
  }>('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC');

  return rows.map((r) => ({
    id: r.id,
    batchId: r.batch_id,
    quantity: r.quantity,
    patientHash: r.patient_hash,
    timestamp: r.timestamp,
  }));
}

/**
 * Returns all items (synced + pending) for the history screen.
 */
export async function getSyncQueue(): Promise<Array<{ batchId: string; quantity: number; timestamp: number; synced: boolean }>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    batch_id: string;
    quantity: number;
    timestamp: number;
    synced: number;
  }>('SELECT batch_id, quantity, timestamp, synced FROM sync_queue ORDER BY created_at DESC LIMIT 50');

  return rows.map((r) => ({
    batchId: r.batch_id,
    quantity: r.quantity,
    timestamp: r.timestamp,
    synced: r.synced === 1,
  }));
}

/**
 * Marks a queue item as synced after successful API submission.
 */
export async function markSynced(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
}
