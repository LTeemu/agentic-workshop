# SensorStream

> AI-generated experimental project. A real-time IoT sensor data pipeline with live dashboard.

Simulates four sensor types (temperature, humidity, pressure, vibration) with smooth random-walk drift, streams readings via Server-Sent Events, and visualizes them in a browser dashboard with per-sensor charts, anomaly detection, and editable thresholds.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:4000`.

## Architecture

```
sensor-sim.js  →  pipeline/validate.js  →  pipeline/clean.js  →  store.js  →  SSE clients
     │                                                              │
     └─── random walk drift, 4 sensor types                         └─── SQLite (better-sqlite3)
```

### Pipeline Stages

1. **Simulation** — `sensor-sim.js` generates a reading every 600ms using unconstrained random walk. Values drift across thresholds naturally (no artificial spikes).

2. **Validation** — `pipeline/validate.js` checks each reading against per-type min/max thresholds and a maximum consecutive-jump limit (e.g., 15°C for temperature). Out-of-range readings are flagged as anomalies.

3. **Cleaning** — `pipeline/clean.js` clamps anomalous values to their nearest valid threshold so the dashboard remains readable during episodes. The original value is preserved for analysis.

4. **Storage** — `pipeline/store.js` writes readings to a local SQLite database (`data/sensorstream.db`). Historical data is pruned to keep at most 10,000 readings.

5. **Streaming** — The server pushes readings to connected browser clients via SSE. Reconnection uses exponential backoff and `Last-Event-ID` for gap-free recovery.

## Dashboard

The UI at `/` shows:

- **Small multiples** — four canvas-based real-time charts (one per sensor) with anomaly markers, threshold indicator lines, and per-panel tooltips
- **Gauge cards** — current values as progress bars with editable min/max thresholds (click to edit, press Enter to save)
- **Readings table** — latest value per sensor with sparkline, trend arrow, and status badge (normal / cleaned / anomaly)
- **Anomaly alerts** — episode-based alert cards that group consecutive anomalies of the same type, auto-dismiss after 30s of normal readings
- **Episode timeline** — color-coded segment bar of recent readings
- **Time window selector** — 5m / 15m / 30m / 1h / 2h chart ranges

Click any sensor row to open a detail panel with aggregate stats (avg, min, max, anomaly count).

## API

| Endpoint                  | Method | Description                      |
| ------------------------- | ------ | -------------------------------- |
| `/api/sensors/stream`     | GET    | SSE stream of real-time readings |
| `/api/sensors/stats`      | GET    | Aggregated stats per sensor type |
| `/api/sensors/thresholds` | GET    | Current validation thresholds    |
| `/api/sensors/thresholds` | PUT    | Update validation thresholds     |
| `/api/sensors/anomalies`  | GET    | Recent anomaly events            |
| `/api/sensors/readings`   | GET    | Paginated historical readings    |
| `/api/health`             | GET    | Server health + uptime           |

## Config

All tunables in `config.js`:

| Key                            | Default | Description                                        |
| ------------------------------ | ------- | -------------------------------------------------- |
| `sensor.intervalMs`            | 600     | Reading generation interval                        |
| `pipeline.maxTempJump`         | 15      | Max allowed °C change between consecutive readings |
| `pipeline.maxHistoryRetention` | 10000   | Max readings kept in DB                            |
| `cache.recentTtlMs`            | 5000    | TTL for recent-readings cache                      |
| `rateLimit.tokensPerSecond`    | 10      | API rate limit                                     |
| `sse.maxClients`               | 50      | Max concurrent SSE connections                     |

## Project Structure

```
sensor-sim.js      — sensor simulation (random walk)
pipeline/
  validate.js      — threshold + jump anomaly detection
  clean.js         — clamp anomalous values
  store.js         — SQLite read/write
  thresholds.js    — editable threshold config
cache.js           — TTL-based in-memory cache
rate-limiter.js    — token bucket rate limiter
db.js              — SQLite connection
server.js          — Express server + SSE
app.js             — Browser dashboard client
config.js          — All configuration
shared/            — Reconnection and SSE helpers
tests/             — Unit tests
```

## Stack

- **Runtime:** Node.js (ESM)
- **Server:** Express + Helmet
- **Database:** SQLite via better-sqlite3
- **Validation:** Zod
- **Streaming:** Server-Sent Events
- **Frontend:** Vanilla JS with Canvas API charts
