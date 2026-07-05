import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Rate limiting — 30 requests per minute per IP on sharing endpoints.
// Health check is excluded from rate limiting.
// ---------------------------------------------------------------------------
const shareLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again later" },
});

app.use("/api/", shareLimiter);

// ---------------------------------------------------------------------------
// File-persisted blob store — survives server restarts.
// Writes to shares.json next to the source file.
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.join(__dirname, "shares.json");

interface StoreEntry {
  blob: string;
  expiresAt: number;
}

const store = new Map<string, StoreEntry>();

/** Load the store from disk on startup. */
function loadStore(): void {
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const data: Record<string, StoreEntry> = JSON.parse(raw);
    const now = Date.now();
    for (const [code, entry] of Object.entries(data)) {
      if (entry.expiresAt > now) {
        store.set(code, entry);
      }
    }
    console.log(`[store] Loaded ${store.size} active shares from disk`);
  } catch (err) {
    console.error("[store] Failed to load shares.json, starting fresh:", err);
  }
}

/** Persist the entire store to disk. */
function persistStore(): void {
  try {
    const data: Record<string, StoreEntry> = {};
    for (const [code, entry] of store) {
      data[code] = entry;
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[store] Failed to persist shares.json:", err);
  }
}

loadStore();

// Clean up expired entries every 10 minutes, persist after cleanup
setInterval(() => {
  const now = Date.now();
  let dirty = false;
  for (const [code, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(code);
      dirty = true;
    }
  }
  if (dirty) persistStore();
}, 10 * 60 * 1000);

app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// POST /api/shares  –  Store an encrypted blob, return a share code
// ---------------------------------------------------------------------------
app.post<{}>("/api/shares", (req, res) => {
  const { blob } = req.body;

  if (!blob || typeof blob !== "string") {
    res.status(400).json({ error: "Missing or invalid 'blob' field" });
    return;
  }

  // Enforce a reasonable size limit (5 MB base64 ≈ 3.75 MB raw)
  if (blob.length > 5_000_000) {
    res.status(413).json({ error: "Blob too large (max 5 MB base64)" });
    return;
  }

  const code = generateCode();
  const expiresAt = Date.now() + TTL_MS;
  store.set(code, { blob, expiresAt });
  persistStore();

  console.log(`[share] Created ${code} (${blob.length} bytes base64)`);
  res.status(201).json({ code, expiresInMs: TTL_MS });
});

// ---------------------------------------------------------------------------
// GET /api/shares/:code  –  Retrieve an encrypted blob (one-shot)
// ---------------------------------------------------------------------------
app.get<{ code: string }>("/api/shares/:code", (req, res) => {
  const { code } = req.params;
  const entry = store.get(code);

  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(code); // clean up expired
    persistStore();
    res.status(404).json({ error: "Share not found or expired" });
    return;
  }

  // One-shot: remove immediately after read
  store.delete(code);
  persistStore();

  console.log(`[share] Retrieved ${code}`);
  res.json({ blob: entry.blob });
});

// ---------------------------------------------------------------------------
// DELETE /api/shares/:code  –  Revoke a share before it is read
// ---------------------------------------------------------------------------
app.delete<{ code: string }>("/api/shares/:code", (req, res) => {
  const { code } = req.params;

  if (!store.has(code)) {
    res.status(404).json({ error: "Share not found" });
    return;
  }

  store.delete(code);
  persistStore();
  console.log(`[share] Deleted ${code}`);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Health check (not rate-limited since it's under / not /api/)
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", shares: store.size });
});

// ---------------------------------------------------------------------------
// Start server — HTTPS if SSL_KEY and SSL_CERT env vars are set, else HTTP
// ---------------------------------------------------------------------------
const sslKey = process.env.SSL_KEY;
const sslCert = process.env.SSL_CERT;

if (sslKey && sslCert) {
  const credentials = {
    key: fs.readFileSync(sslKey, "utf-8"),
    cert: fs.readFileSync(sslCert, "utf-8"),
  };
  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`SecureNote share server running on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(
      `SecureNote share server running on http://localhost:${PORT} ` +
      `(set SSL_KEY and SSL_CERT for HTTPS)`
    );
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Generate a short, human-readable share code: XXXX-XXXX (8 alphanumeric) */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 to avoid confusion
  const pair = () => chars.at(crypto.randomInt(chars.length))! +
                chars.at(crypto.randomInt(chars.length))!;
  return `${pair()}${pair()}-${pair()}${pair()}`;
}
