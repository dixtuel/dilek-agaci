/**
 * Cloudflare Pages Functions - /api/wishes
 * Handles GET (listing wishes) and POST (creating wishes with moderation & Turso libSQL).
 * Fully compatible with the Node.js/Express backend.
 */

// Turkish Bad Words Blacklist for Instant Local Rejection
const BANNED_PATTERNS = [
  /\b(amk|aq|orospu|pic|piç|sik|siktir|yarrak|yarak|göt|got|kahpe|pezevenk|tasak|taşak|döl|ebeni|amına|amina|amcık|amcik|meme|vajina|penis)\b/i,
  /\b(porno|sikiş|sikis|escort|eskort|sex|seks|kumar|bahis|casino|bet\d+|slot)\b/i,
];

function quickFilterReject(text) {
  if (!text || typeof text !== "string") return true;
  const clean = text.toLowerCase().replace(/[\s\-_.]+/g, " ");
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(clean)) return true;
  }
  return false;
}

/**
 * Text Compression using Web Standard CompressionStream (Deflate)
 * Compatible with Node.js zlib deflate/inflate
 */
async function compressText(raw) {
  if (!raw || typeof raw !== "string" || raw.length < 24) return raw;
  try {
    const stream = new Blob([new TextEncoder().encode(raw)])
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const payload = `z64:${base64}`;
    return payload.length < raw.length ? payload : raw;
  } catch {
    return raw;
  }
}

/**
 * Text Decompression using Web Standard DecompressionStream (Deflate)
 */
async function decompressText(stored) {
  if (!stored || typeof stored !== "string" || !stored.startsWith("z64:")) {
    return stored;
  }
  try {
    const binary = atob(stored.slice(4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buffer);
  } catch {
    return stored;
  }
}

/**
 * Turso (libSQL) HTTP Pipeline Client (Zero-dependency, high-speed Edge fetch)
 */
async function tursoQuery(env, sql, args = []) {
  const dbUrl = env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://");
  const authToken = env.TURSO_AUTH_TOKEN;

  const body = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql,
          args: args.map((arg) => {
            if (arg === null || arg === undefined) return { type: "null" };
            if (typeof arg === "number") return { type: "integer", value: String(arg) };
            return { type: "text", value: String(arg) };
          }),
        },
      },
      { type: "close" },
    ],
  };

  const res = await fetch(`${dbUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Turso HTTP error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const execResult = data.results?.[0];
  if (execResult?.type === "error") {
    throw new Error(`Turso query error: ${execResult.error.message}`);
  }

  const response = execResult?.response?.result;
  if (!response) return { rows: [], affected_row_count: 0 };

  const cols = response.cols.map((c) => c.name);
  const rows = (response.rows || []).map((row) => {
    const obj = {};
    row.forEach((val, idx) => {
      obj[cols[idx]] = val.value;
    });
    return obj;
  });

  return { rows, affected_row_count: response.affected_row_count || 0 };
}

let tableInitialized = false;
async function ensureTable(env) {
  if (tableInitialized) return;
  try {
    await tursoQuery(
      env,
      "CREATE TABLE IF NOT EXISTS wishes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))"
    );
    tableInitialized = true;
  } catch (err) {
    console.warn("Table init warning:", err.message);
  }
}

/**
 * Verify hCaptcha
 */
async function verifyHcaptcha(secret, token, remoteIp) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

/**
 * Content Moderation via NVIDIA NIM
 */
const TASK_TEMPLATE = (wishText) => `Task: Check if there is unsafe content in the user or agent messages in the below conversation in accordance with our safety policy with the below categories. Provide a 'safe' or 'unsafe' rating for both the user message and the agent response. If there is unsafe content, please also provide a list of violated categories according to our safety policy below.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violence.
S2: Sexual.
S3: Criminal Planning/Confessions.
S4: Guns and Illegal Weapons.
S5: Controlled/Regulated Substances.
S6: Suicide and Self Harm.
S7: Sexual (minor).
S8: Hate/Identity Hate.
S9: PII/Privacy.
S10: Harassment.
S11: Threat.
S12: Profanity.
S13: Needs Caution.
S14: Other.
S15: Manipulation.
S16: Fraud/Deception.
S17: Malware.
S18: High Risk Gov Decision Making.
S19: Political/Misinformation/Conspiracy.
S20: Copyright/Trademark/Plagiarism.
S21: Unauthorized Advice.
S22: Illegal Activity.
S23: Immoral/Unethical.
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>

user: ${wishText}

<END CONVERSATION>

Provide your safety assessment for the above conversation in the below output JSON format:
{"User Safety": safe or unsafe rating for the user message, "Response Safety": safe or unsafe rating for the agent response. Omit if no agent response present. "Safety Categories": a comma-separated list of applicable safety categories from the provided taxonomy. Omit if all safe.}

Do not include anything other than the output JSON in your response.
Output JSON: `;

async function moderateWish(env, text) {
  if (quickFilterReject(text)) {
    return { safe: false, category: "yerel-filtre" };
  }

  const apiKey = env.NIM_API_KEY;
  if (!apiKey) return { safe: true, category: "unmoderated" };

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.NIM_MODEL || "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
        temperature: 0,
        max_tokens: 100,
        messages: [{ role: "user", content: TASK_TEMPLATE(text) }],
      }),
    });

    if (!res.ok) throw new Error(`NIM API ${res.status}`);
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid NIM JSON");
    const parsed = JSON.parse(match[0]);
    const userSafety = String(parsed["User Safety"] || "").toLowerCase();
    return {
      safe: userSafety === "safe",
      category: parsed["Safety Categories"] || "none",
    };
  } catch (err) {
    return { safe: false, category: "moderasyon-hatasi", error: err.message };
  }
}

/**
 * JSON Response Helper with CORS & Cache Headers
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
    },
  });
}

/**
 * Handle OPTIONS (CORS Preflight)
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Handle GET /api/wishes
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const since = Number.parseInt(url.searchParams.get("since") || "0", 10) || 0;
  const limit = Math.min(Number.parseInt(url.searchParams.get("limit") || "200", 10) || 200, 500);

  try {
    await ensureTable(env);
    const queryResult = await tursoQuery(
      env,
      "SELECT id, name, text, created_at FROM wishes WHERE id > ? ORDER BY id ASC LIMIT ?",
      [since, limit]
    );

    const wishes = await Promise.all(
      queryResult.rows.map(async (row) => ({
        id: Number(row.id),
        name: row.name || null,
        text: await decompressText(row.text),
        created_at: row.created_at,
      }))
    );

    const countResult = await tursoQuery(env, "SELECT COUNT(*) AS total FROM wishes");
    const total = Number(countResult.rows[0]?.total || 0);

    return jsonResponse(
      { wishes, total },
      200,
      { "Cache-Control": "no-cache, private" }
    );
  } catch (err) {
    return jsonResponse({ error: "Dilekler yüklenemedi", detail: err.message }, 500);
  }
}

/**
 * Handle POST /api/wishes
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const clientIp = request.headers.get("CF-Connecting-IP") || "";

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Geçersiz istek gövdesi" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : null;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const hcaptchaToken = typeof body.hcaptchaToken === "string" ? body.hcaptchaToken : "";

  if (!text || text.length < 2 || text.length > 220) {
    return jsonResponse({ error: "Dilek 2 ile 220 karakter arasında olmalıdır" }, 400);
  }

  if (env.HCAPTCHA_SECRET) {
    const isHuman = await verifyHcaptcha(env.HCAPTCHA_SECRET, hcaptchaToken, clientIp);
    if (!isHuman) {
      return jsonResponse({ error: "Bot doğrulaması başarısız oldu, lütfen tekrar deneyin" }, 400);
    }
  }

  const moderation = await moderateWish(env, text);
  if (!moderation.safe) {
    return jsonResponse(
      { error: "Dileğin içerik kurallarımıza uymadığı için paylaşılamadı." },
      422
    );
  }

  try {
    await ensureTable(env);
    const compressed = await compressText(text);
    const result = await tursoQuery(
      env,
      "INSERT INTO wishes (name, text) VALUES (?, ?) RETURNING id, name, text, created_at",
      [name || null, compressed]
    );

    const inserted = result.rows[0];
    const createdWish = {
      id: Number(inserted.id),
      name: inserted.name || null,
      text: await decompressText(inserted.text),
      created_at: inserted.created_at,
    };

    return jsonResponse({ wish: createdWish }, 201);
  } catch (err) {
    return jsonResponse({ error: "Dilek kaydedilemedi", detail: err.message }, 500);
  }
}
