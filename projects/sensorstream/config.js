import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 4000,
  bindAddr: '0.0.0.0', // Accept all interfaces; outside access blocked by middleware
  // Only these IPs/ranges are allowed to connect (localhost IPv4 + IPv6)
  allowedRemoteAddrs: ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'],

  // Paths
  dbPath: resolve(__dirname, 'data', 'sensorstream.db'),
  staticDir: resolve(__dirname),

  // Sensor simulation
  sensor: {
    intervalMs: 600, // Generate a reading every 600ms
    types: {
      temperature: { min: -5, max: 45, unit: 'celsius', nominal: 22 },
      humidity: { min: 10, max: 95, unit: 'percent', nominal: 50 },
      pressure: { min: 970, max: 1050, unit: 'hpa', nominal: 1013 },
      vibration: { min: 0, max: 30, unit: 'mm/s', nominal: 2 },
    },
  },

  // Pipeline
  pipeline: {
    maxTempJump: 15, // Max allowed °C change between consecutive readings
    maxHistoryRetention: 10000, // Max readings kept in DB before pruning
  },

  // Caching
  cache: {
    recentTtlMs: 5_000, // Recent readings cached for 5s
    statsTtlMs: 10_000, // Aggregated stats cached for 10s
    maxRecentCount: 100, // Max recent readings in cache
  },

  // Rate limiting
  rateLimit: {
    tokensPerSecond: 10,
    maxBurst: 20,
  },

  // SSE
  sse: {
    maxClients: 50,
    heartbeatMs: 15_000, // Keep-alive ping every 15s
  },
};

export default config;
