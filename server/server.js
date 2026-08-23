const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const zlib = require("zlib");
const { z } = require("zod");

const { init, createWish, listSince, totalWishes } = require("./db");
const { moderateWish } = require("./moderation");
const { verifyHcaptcha } = require("./hcaptcha");

const app = express();

// Trust reverse proxy (Render, Cloudflare, etc.)
app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://js.hcaptcha.com"],
        frameSrc: ["https://newassets.hcaptcha.com", "https://*.hcaptcha.com"],
        connectSrc: ["'self'", "https://*.hcaptcha.com"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
  })
);

// Lightweight JSON parser limited to 5kb to protect memory on 512MB RAM
app.use(express.json({ limit: "5kb" }));

// Lightweight built-in response compression middleware (Gzip / Deflate)
app.use((req, res, next) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (!acceptEncoding.includes("gzip") || req.method === "HEAD") {
    return next();
  }

  const originalSend = res.send;
  res.send = function (body) {
    // Only compress text / json payloads larger than 512 bytes
    if (typeof body === "string" || Buffer.isBuffer(body)) {
      const contentType = res.getHeader("Content-Type") || "";
      if (
        (contentType.includes("json") || contentType.includes("html") || contentType.includes("text") || contentType.includes("css") || contentType.includes("javascript")) &&
        body.length > 512
      ) {
        res.setHeader("Content-Encoding", "gzip");
        res.removeHeader("Content-Length");
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
        const gzipped = zlib.gzipSync(buf, { level: 6 });
        return originalSend.call(this, gzipped);
      }
    }
    return originalSend.call(this, body);
  };
  next();
});

// Cache static files efficiently for 512MB RAM & 0.15 CPU hosts
const publicDir = path.join(__dirname, "..", "public");
const indexTemplate = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
const renderedIndex = indexTemplate.replace(
  "__HCAPTCHA_SITE_KEY__",
  process.env.HCAPTCHA_SITE_KEY || ""
);

app.get(["/", "/index.html"], (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.type("html").send(renderedIndex);
});

// Aggressive caching for static assets with cache-busting query strings
app.use(
  express.static(publicDir, {
    index: false,
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css") || filePath.endsWith(".js") || filePath.endsWith(".svg")) {
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      }
    },
  })
);

const wishSchema = z.object({
  name: z.string().trim().max(40).optional().or(z.literal("")),
  text: z.string().trim().min(2).max(220),
  hcaptchaToken: z.string().min(1),
});

// Global submission rate limiter: Allow bursts so 5+ users can write concurrently
const submitLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes window per IP
  limit: 8,                // 8 wishes per 2 min per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/wishes", async (req, res, next) => {
  try {
    const since = Number.parseInt(req.query.since, 10) || 0;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 200, 500);

    // Dynamic cache header for API polling
    res.setHeader("Cache-Control", "no-cache, private");

    const [wishes, total] = await Promise.all([listSince(since, limit), totalWishes()]);
    res.json({ wishes, total });
  } catch (err) {
    next(err);
  }
});

app.post("/api/wishes", submitLimiter, async (req, res, next) => {
  try {
    const parsed = wishSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz istek." });
    }
    const { name, text, hcaptchaToken } = parsed.data;

    let isHuman;
    try {
      isHuman = await verifyHcaptcha(hcaptchaToken, req.ip);
    } catch (err) {
      return res.status(503).json({ error: "Doğrulama şu anda kullanılamıyor." });
    }
    if (!isHuman) {
      return res.status(403).json({ error: "Doğrulama başarısız oldu, tekrar deneyin." });
    }

    const moderation = await moderateWish(text);
    if (!moderation.safe) {
      return res.status(422).json({
        error: "Bu dilek yayınlanamadı. Lütfen ifadeni gözden geçirip tekrar dene.",
      });
    }

    // Handles concurrent multi-user write with retry queue
    const wish = await createWish({ name, text });
    const total = await totalWishes();
    res.status(201).json({ wish, total });
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

app.use((err, req, res, next) => {
  console.error("Express hatası:", err.message);
  res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
});

const PORT = process.env.PORT || 3020;

init()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Dilek Ağacı ${PORT} portunda çalışıyor.`);
    });
    // KeepAlive timeout optimization for low memory container proxies
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  })
  .catch((err) => {
    console.error("Veritabanı başlatılamadı:", err);
    process.exit(1);
  });
