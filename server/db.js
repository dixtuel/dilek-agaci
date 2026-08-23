const { createClient } = require("@libsql/client");

// Turso (libSQL) — ücretsiz Node barındırıcılarının (Render, Railway, vb.) çoğunda
// disk kalıcı olmadığı için veriler orada değil, Turso'nun kalıcı bulut veritabanında
// tutulur. TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN, hosting panelinin "Environment
// Variables" bölümünden girilir.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

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

async function createWish({ name, text }) {
  const result = await client.execute({
    sql: "INSERT INTO wishes (name, text) VALUES (?, ?) RETURNING id, name, text, created_at",
    args: [name || null, text],
  });
  return result.rows[0];
}

async function listSince(since, limit) {
  const result = await client.execute({
    sql: "SELECT id, name, text, created_at FROM wishes WHERE id > ? ORDER BY id ASC LIMIT ?",
    args: [since, limit],
  });
  return result.rows;
}

async function totalWishes() {
  const result = await client.execute("SELECT COUNT(*) AS total FROM wishes");
  return Number(result.rows[0].total);
}

module.exports = { init, createWish, listSince, totalWishes };
