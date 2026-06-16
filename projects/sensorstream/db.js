import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import config from './config.js';

let db = null;

/**
 * Initializes the SQLite database, creating tables if they don't exist.
 * Exports a singleton getter so all modules share one connection.
 */
export function getDb() {
  if (db) return db;

  mkdirSync(dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id              TEXT PRIMARY KEY,
      timestamp       INTEGER NOT NULL,
      type            TEXT NOT NULL CHECK(type IN ('temperature','humidity','pressure','vibration')),
      value           REAL NOT NULL,
      unit            TEXT NOT NULL,
      cleaned         INTEGER NOT NULL DEFAULT 0,
      cleaned_at      INTEGER,
      original_value  REAL,
      anomaly         INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id              TEXT PRIMARY KEY,
      reading_id      TEXT NOT NULL REFERENCES readings(id),
      type            TEXT NOT NULL,
      value           REAL NOT NULL,
      reason          TEXT NOT NULL,
      timestamp       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_readings_type ON readings(type);
    CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
    CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp);
  `);

  return db;
}

/**
 * Gracefully close the database connection.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
