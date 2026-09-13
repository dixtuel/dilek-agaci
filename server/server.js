const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const { init } = require("./db");
const wishesRouter = require("./routes/wishes");

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

// Standart Gzip compression middleware (monkey-patching res.send kaldırıldı)
app.use(
  compression({
    threshold: 512,
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

const publicDir = path.join(__dirname, "..", "public");
const indexTemplate = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
const enIndexTemplate = fs.readFileSync(path.join(publicDir, "en", "index.html"), "utf8");
const siteKey = process.env.HCAPTCHA_SITE_KEY || "";
const renderedIndex = indexTemplate.replace("__HCAPTCHA_SITE_KEY__", siteKey);
const renderedEnIndex = enIndexTemplate.replace("__HCAPTCHA_SITE_KEY__", siteKey);

app.get(["/", "/index.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.type("html").send(renderedIndex);
});

app.get(["/en", "/en/", "/en/index.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.type("html").send(renderedEnIndex);
});

// Static assets: Cache long-term with query param busting, but force HTML to revalidate
app.use(
  express.static(publicDir, {
    index: false,
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filePath.endsWith(".css") || filePath.endsWith(".js") || filePath.endsWith(".svg")) {
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      }
    },
  })
);

// Modüler API Rotaları
app.use("/api/wishes", wishesRouter);

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

module.exports = app;
