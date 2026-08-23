const { createClient } = require("@libsql/client");
const zlib = require("zlib");

// Turso (libSQL) — veriler Turso'nun kalıcı bulut veritabanında tutulur.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Compress text using Node.js built-in zlib deflate.
 * Adds 'z64:' magic prefix to identify compressed payloads.
 * If compression does not reduce size (e.g. tiny strings), keeps raw text.
 */
function compressText(raw) {
  if (!raw || typeof raw !== "string" || raw.length < 24) {
    return raw;
  }
  try {
    const compressed = zlib.deflateSync(Buffer.from(raw, "utf8"));
    const base64 = compressed.toString("base64");
    const payload = `z64:${base64}`;
    // Only use compressed version if it is actually shorter
    return payload.length < raw.length ? payload : raw;
  } catch (err) {
    console.warn("Dilek sıkıştırma hatası, ham metin kullanılıyor:", err.message);
    return raw;
  }
}

/**
 * Decompress text with 100% backward compatibility for legacy plain text rows.
 */
function decompressText(stored) {
  if (!stored || typeof stored !== "string") {
    return stored;
  }
  if (!stored.startsWith("z64:")) {
    return stored; // Plain text (legacy entry)
  }
  try {
    const buffer = Buffer.from(stored.slice(4), "base64");
    return zlib.inflateSync(buffer).toString("utf8");
  } catch (err) {
    console.warn("Dilek açma hatası, ham veri dönülüyor:", err.message);
    return stored;
  }
}

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

/**
 * Helper to delay execution with jitter for concurrent retries
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create wish with compression and concurrent retry queue (supports 5+ concurrent writers)
 */
async function createWish({ name, text }, maxRetries = 3) {
  const compressedText = compressText(text);

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.execute({
        sql: "INSERT INTO wishes (name, text) VALUES (?, ?) RETURNING id, name, text, created_at",
        args: [name || null, compressedText],
      });

      const row = result.rows[0];
      return {
        id: Number(row.id),
        name: row.name,
        text: decompressText(row.text),
        created_at: row.created_at,
      };
    } catch (err) {
      lastError = err;
      // If busy or rate limited by provider, retry with backoff + random jitter
      if (attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 60) + 40; // 40-100ms
        await sleep(attempt * jitter);
      }
    }
  }

  throw lastError;
}

/**
 * List wishes with transparent decompression
 */
async function listSince(since, limit) {
  const result = await client.execute({
    sql: "SELECT id, name, text, created_at FROM wishes WHERE id > ? ORDER BY id ASC LIMIT ?",
    args: [since, limit],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    text: decompressText(row.text),
    created_at: row.created_at,
  }));
}

async function totalWishes() {
  const result = await client.execute("SELECT COUNT(*) AS total FROM wishes");
  return Number(result.rows[0].total);
}

module.exports = { init, createWish, listSince, totalWishes, compressText, decompressText };
