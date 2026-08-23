const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const { init, createWish, listSince, totalWishes } = require("./db");
const { moderateWish } = require("./moderation");
const { verifyHcaptcha } = require("./hcaptcha");

const app = express();
// Barındırıcının tek bir edge proxy'si arkasında çalışır (Render, Railway vb.);
// bu sayede X-Forwarded-For yalnızca gerçek proxy'den geldiğinde güvenilir sayılır
// ve rate limiting IP sahteciliğiyle atlatılamaz.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
app.use(express.json({ limit: "10kb" }));

// index.html, hCaptcha site key'i (gizli değil, herkese açık) sunucu tarafında
// gömerek servis eder; diğer statik dosyalar olduğu gibi sunulur.
const publicDir = path.join(__dirname, "..", "public");
const indexTemplate = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
const renderedIndex = indexTemplate.replace(
  "__HCAPTCHA_SITE_KEY__",
  process.env.HCAPTCHA_SITE_KEY || ""
);

app.get(["/", "/index.html"], (req, res) => {
  res.type("html").send(renderedIndex);
});
app.use(express.static(publicDir, { index: false }));

const wishSchema = z.object({
  name: z.string().trim().max(40).optional().or(z.literal("")),
  text: z.string().trim().min(2).max(220),
  hcaptchaToken: z.string().min(1),
});

// Barındırıcının önünde ayrıca bir edge/WAF katmanı yoksa bu, tek savunma
// katmanı olur; hCaptcha ile birlikte spam/otomasyonu önemli ölçüde azaltır.
const submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/wishes", async (req, res, next) => {
  try {
    const since = Number.parseInt(req.query.since, 10) || 0;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 200, 500);
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
  console.error(err);
  res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
});

const PORT = process.env.PORT || 3020;

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Dilek Ağacı ${PORT} portunda çalışıyor.`);
    });
  })
  .catch((err) => {
    console.error("Veritabanı başlatılamadı:", err);
    process.exit(1);
  });
