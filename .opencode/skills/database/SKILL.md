---
name: database
description: 'SQL schema design, queries, migrations, SQLite/PostgreSQL patterns, indexing, normalization, data integrity.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [database, sql, schema, migration, sqlite, postgresql, query]
tools: [opencode, claude, cursor, gemini]
---

# Database

You are a **database specialist**. You design schemas that enforce data integrity at the storage layer. Tables have clear relationships, appropriate constraints, and sensible indexes.

## Schema Design Principles

- Each table has a single responsibility
- Columns have explicit types and constraints (NOT NULL, DEFAULT, UNIQUE)
- Foreign keys enforce referential integrity
- Indexes match query patterns, not every column
- Migrations are reversible and versioned

## Naming Conventions

| Class       | Convention             | Example                    |
| ----------- | ---------------------- | -------------------------- |
| Tables      | snake_case, plural     | `projects`, `project_tags` |
| Columns     | snake_case             | `created_at`, `is_active`  |
| Primary key | `id` (integer or UUID) | `id INTEGER PRIMARY KEY`   |
| Foreign key | `{table}_id`           | `project_id`               |
| Join table  | `{a}_{b}`              | `project_tags`             |
| Indexes     | `idx_{table}_{column}` | `idx_projects_created_at`  |

## SQLite (Embedded / Dev)

Best for single-server apps, prototypes, and tools. Zero configuration.

```sql
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

## PostgreSQL (Production)

Use when you need concurrent writers, complex queries, or JSONB.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_metadata ON projects USING GIN(metadata);
```

## Connection Management

### SQLite (better-sqlite3 — synchronous, simpler)

```javascript
// models/db.js
const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

const db = new Database(config.db.path);

// Enable WAL mode for concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
```

### PostgreSQL (pg)

```javascript
// models/db.js
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('Unexpected pool error:', err));

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) console.warn(`Slow query (${duration}ms):`, text.slice(0, 100));
  return result;
}

module.exports = { query, pool };
```

## Query Patterns

### CRUD

```javascript
// models/projects.js
const db = require('./db');

function findAll({ limit = 20, offset = 0, status } = {}) {
  let sql = 'SELECT * FROM projects';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
}

function findById(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function insert(data) {
  const stmt = db.prepare(`
    INSERT INTO projects (name, description, status)
    VALUES (@name, @description, @status)
  `);
  const result = stmt.run(data);
  return findById(result.lastInsertRowid);
}

function update(id, data) {
  const fields = Object.keys(data).filter((k) => k !== 'id');
  if (!fields.length) return findById(id);
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`
    UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = ?
  `);
  stmt.run({ ...data, id });
  return findById(id);
}

function remove(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}
```

### Transactions

```javascript
function createWithTags(data, tagIds) {
  const transaction = db.transaction(() => {
    const project = insert(data);
    const stmt = db.prepare('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      stmt.run(project.id, tagId);
    }
    return project;
  });
  return transaction();
}
```

## Migrations

Versioned, sequential, reversible.

```javascript
// models/migrations/001_create_projects.js
exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
};

exports.down = function (db) {
  db.exec('DROP TABLE IF EXISTS projects');
};
```

```javascript
// models/migrate.js
const db = require('./db');
const fs = require('fs');
const path = require('path');

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

function pending() {
  const applied = db
    .prepare('SELECT name FROM _migrations')
    .all()
    .map((r) => r.name);
  const files = fs.readdirSync(path.join(__dirname, 'migrations')).sort();
  return files.filter((f) => !applied.includes(f));
}

function up() {
  const migrations = pending();
  for (const file of migrations) {
    const m = require(`./migrations/${file}`);
    m.up(db);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    console.log(`Applied: ${file}`);
  }
}

function down(target) {
  const applied = db
    .prepare('SELECT name FROM _migrations ORDER BY name DESC')
    .all()
    .map((r) => r.name);
  for (const file of applied) {
    if (target && file <= target) break;
    const m = require(`./migrations/${file}`);
    m.down(db);
    db.prepare('DELETE FROM _migrations WHERE name = ?').run(file);
    console.log(`Rolled back: ${file}`);
  }
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'up') up();
  else if (cmd === 'down') down(process.argv[3]);
  else console.log('Usage: node models/migrate.js up|down [target]');
}
```

## Indexing Rules

| Query pattern                   | Index type                   | Example                                                             |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Equality filter (`WHERE x = ?`) | B-tree on x                  | `CREATE INDEX idx_projects_status ON projects(status)`              |
| Range filter (`WHERE x > ?`)    | B-tree on x                  | `CREATE INDEX idx_projects_created ON projects(created_at)`         |
| Sort order (`ORDER BY x`)       | B-tree on x (same direction) | `CREATE INDEX idx_projects_name ON projects(name)`                  |
| Foreign key joins               | B-tree on FK column          | `CREATE INDEX idx_project_tags_project ON project_tags(project_id)` |
| Full-text search                | FTS5 (SQLite) / GIN (PG)     | `CREATE VIRTUAL TABLE projects_fts USING fts5(name, description)`   |
| JSON field queries (PG)         | GIN on JSONB                 | `CREATE INDEX idx_projects_meta ON projects USING GIN(metadata)`    |

### Index anti-patterns

- ❌ Indexing every column — slows writes, uses space
- ❌ Indexing low-cardinality booleans — rarely useful
- ❌ Not indexing foreign keys — slows JOINs
- ❌ Over-indexing small tables (< 100 rows) — unnecessary overhead

## Normalization

| Normal form | Rule                                                         |
| ----------- | ------------------------------------------------------------ |
| 1NF         | Each column is atomic (no arrays, no comma-separated values) |
| 2NF         | Every non-key column depends on the whole primary key        |
| 3NF         | Every non-key column depends only on the primary key         |

### Denormalize when

- Read performance is critical and writes are rare
- You need full-text search across joined data
- You're storing precomputed aggregates (counts, totals)

## Common Pitfalls

| Problem                  | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| No foreign keys          | Always use REFERENCES with ON DELETE CASCADE/RESTRICT |
| No migrations            | Versioned migration files, never manual ALTER TABLE   |
| Connection leak          | Always use pool.query() or proper release of clients  |
| N+1 queries              | Use JOIN or batch loading                             |
| SELECT \* in production  | Name columns explicitly                               |
| Stringly-typed enums     | Use CHECK constraint or a lookup table                |
| No indexes on FK columns | Index every foreign key                               |

## Checklist

- [ ] Tables are normalized to 3NF (denormalize only when justified)
- [ ] Foreign keys have indexes
- [ ] All columns have explicit types and constraints
- [ ] Migrations are versioned and reversible
- [ ] Connection pool is configured with max/reasonable limits
- [ ] Queries use parameterized statements (no string interpolation)
- [ ] Transactions wrap multi-step write operations
- [ ] Slow queries are logged (> 100ms)
- [ ] No SELECT \* in production code
- [ ] JOIN queries have covering indexes
