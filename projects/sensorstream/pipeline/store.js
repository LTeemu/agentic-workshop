import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import config from '../config.js';

const insertReading = null; // Prepared later
const insertAnomaly = null;
const pruneOld = null;

/**
 * Stores a cleaned reading in SQLite.
 * Also inserts an anomaly record if the reading was flagged.
 *
 * @param {object} cleaned - The output of cleanReading().
 */
export function storeReading(cleaned) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO readings (id, timestamp, type, value, unit, cleaned, cleaned_at, original_value, anomaly)
    VALUES (@id, @timestamp, @type, @value, @unit, @cleaned, @cleanedAt, @originalValue, @anomaly)
  `);

  stmt.run({
    id: cleaned.id,
    timestamp: cleaned.timestamp,
    type: cleaned.type,
    value: cleaned.value,
    unit: cleaned.unit,
    cleaned: cleaned.cleaned ? 1 : 0,
    cleanedAt: cleaned.cleanedAt || null,
    originalValue: cleaned.originalValue ?? null,
    anomaly: cleaned.anomaly ? 1 : 0,
  });

  // Insert anomaly record if flagged
  if (cleaned.anomaly && cleaned.anomalyReason) {
    const anomalyStmt = db.prepare(`
      INSERT OR IGNORE INTO anomalies (id, reading_id, type, value, reason, timestamp)
      VALUES (@id, @readingId, @type, @value, @reason, @timestamp)
    `);

    anomalyStmt.run({
      id: randomUUID(),
      readingId: cleaned.id,
      type: cleaned.type,
      value: cleaned.originalValue ?? cleaned.value,
      reason: cleaned.anomalyReason,
      timestamp: cleaned.timestamp,
    });
  }
}

/**
 * Retrieves recent readings from the database.
 *
 * @param {object} opts
 * @param {number} [opts.limit=50]
 * @param {string} [opts.type] - Filter by sensor type.
 * @param {number} [opts.since] - Epoch ms, only readings after this time.
 * @returns {Array}
 */
export function getReadings(opts = {}) {
  const db = getDb();
  const { limit = 50, type, since } = opts;

  let sql = 'SELECT * FROM readings WHERE 1=1';
  const params = {};

  if (type) {
    sql += ' AND type = @type';
    params.type = type;
  }
  if (since) {
    sql += ' AND timestamp >= @since';
    params.since = since;
  }

  sql += ' ORDER BY timestamp DESC LIMIT @limit';
  params.limit = Math.min(limit, 1000);

  return db.prepare(sql).all(params);
}

/**
 * Returns aggregated stats (min, max, avg, count) per sensor type.
 *
 * @param {number} [since] - Epoch ms window start.
 * @returns {Array}
 */
export function getStats(since) {
  const db = getDb();

  let sql = `
    SELECT type,
           COUNT(*) AS count,
           MIN(value) AS min,
           MAX(value) AS max,
           ROUND(AVG(value), 2) AS avg,
           SUM(anomaly) AS anomalies
    FROM readings
    WHERE 1=1
  `;
  const params = {};

  if (since) {
    sql += ' AND timestamp >= @since';
    params.since = since;
  }

  sql += ' GROUP BY type ORDER BY type';

  return db.prepare(sql).all(params);
}

/**
 * Returns recent anomaly records.
 *
 * @param {number} [limit=20]
 * @returns {Array}
 */
export function getAnomalies(limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT * FROM anomalies
    ORDER BY timestamp DESC
    LIMIT ?
  `,
    )
    .all(Math.min(limit, 200));
}

/**
 * Prunes old readings past the retention limit.
 * Keeps the newest N readings and removes older ones.
 */
export function pruneOldReadings() {
  const db = getDb();
  const maxRetain = config.pipeline.maxHistoryRetention;

  // Delete child rows (anomalies) first to respect FOREIGN KEY constraint
  const anomalyResult = db
    .prepare(
      `
      DELETE FROM anomalies WHERE reading_id NOT IN (
        SELECT id FROM readings ORDER BY timestamp DESC LIMIT ?
      )
    `,
    )
    .run(maxRetain);

  // Then delete old readings
  const readingResult = db
    .prepare(
      `
    DELETE FROM readings WHERE id NOT IN (
      SELECT id FROM readings ORDER BY timestamp DESC LIMIT ?
    )
  `,
    )
    .run(maxRetain);

  return readingResult.changes;
}
