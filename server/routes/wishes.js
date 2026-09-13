const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { createWish, listSince, totalWishes } = require("../db");
const { moderateWish } = require("../moderation");
const { verifyHcaptcha } = require("../hcaptcha");

const router = express.Router();

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

// GET /api/wishes - dilekleri listele
router.get("/", async (req, res, next) => {
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

// POST /api/wishes - yeni dilek ekle
router.post("/", submitLimiter, async (req, res, next) => {
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

module.exports = router;
