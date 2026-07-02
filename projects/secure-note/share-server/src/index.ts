import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// In-memory blob store — ephemeral, restart clears all shares.
// For production: replace with Redis / SQLite / filesystem.
// ---------------------------------------------------------------------------
const store = new Map<string, { blob: string; expiresAt: number }>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt < now) store.delete(code);
  }
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
  store.set(code, { blob, expiresAt: Date.now() + TTL_MS });

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
    res.status(404).json({ error: "Share not found or expired" });
    return;
  }

  // One-shot: remove immediately after read
  store.delete(code);

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
  console.log(`[share] Deleted ${code}`);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", shares: store.size });
});

app.listen(PORT, () => {
  console.log(`SecureNote share server running on http://localhost:${PORT}`);
});

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
