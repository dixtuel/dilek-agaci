# Dilek Ağacı

[![Siteyi ziyaret et](https://img.shields.io/badge/dilekagaci.dxtl.com.tr-canlı_site-e8785a?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dilekagaci.dxtl.com.tr)

Herkesin ortak gördüğü, dilek yazıldıkça çiçek açan bir dilek ağacı sitesi. İster standart **Node.js/Express** sunucusunda (Render, VPS, Docker), ister **Cloudflare Pages / Workers** Edge ortamında %100 uyumlu olarak çalıştırılabilir. Veritabanı **Turso (bulut tabanlı libSQL/SQLite)** olduğu için hangi platforma deploy ederseniz edin veriler kalıcı ve eşzamanlıdır.

## Mimari — Neden Bu Seçimler?

- **Çift Çalışma Modu (Dual Runtime)**:
  - **Cloudflare Pages + Functions**: Statik varlıklar (HTML, CSS, JS) Cloudflare global CDN'inden **sınırsız ve ücretsiz** sunulur. API (`/api/wishes`) ise Pages Functions üzerinde **0 ms Cold Start** ile Edge'de çalışır.
  - **Node.js / Express**: `server/server.js` üzerinden klasik Docker, VPS veya Render konteynerlerinde çalışmaya devam eder.
- **Turso (libSQL)**: Kalıcı bulut SQLite veritabanı. `CompressionStream` ve `zlib` ile metinler şeffaf olarak sıkıştırılır.
- **hCaptcha**: Form spam/bot koruması.
- **NVIDIA NIM (`llama-3.1-nemotron-safety-guard-8b-v3`)**: 23 kategorilik taksonomiyle çalışan içerik güvenliği modeli + yerel Türkçe kara liste filtresi.
- **Fail-closed moderasyon**: Moderasyon servisine ulaşılamazsa güvenliği sağlamak için dilek reddedilir.

---

## 1) Dağıtım Yöntemleri (Deployment Options)

### Seçenek A: Cloudflare Pages (Önerilen — 0 ms Cold Start & Sınırsız Statik Trafik)

1. Bu repoyu GitHub'a push edin.
2. [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **Compute (Workers & Pages)** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git** seçin.
3. Ayarlar:
   - **Framework Preset**: `None`
   - **Build output directory**: `public`
   - **Root directory**: `/`
4. **Environment Variables** bölümüne değişkenleri ekleyin (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NIM_API_KEY`, `NIM_MODEL`, `HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET`).
5. **Save and Deploy** butonuna tıklayın.

*(Wrangler CLI ile yerel geliştirme için: `npx wrangler pages dev public`)*

---

### Seçenek B: Node.js / Docker / Render

```bash
npm install
npm start
# http://localhost:3020
```

Render, Fly.io veya VPS üzerinde `node server/server.js` komutuyla doğrudan ayağa kaldırabilirsiniz.

---

## 2) Ortam Değişkenleri

`.env.example` dosyasını kopyalayarak yerel ortamınızı oluşturabilirsiniz:

| Değişken | Açıklama |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso veritabanı bağlantı adresi (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso erişim token'ı |
| `NIM_API_KEY` | build.nvidia.com API anahtarı |
| `NIM_MODEL` | Kullanılacak model (`nvidia/llama-3.1-nemotron-safety-guard-8b-v3`) |
| `HCAPTCHA_SECRET` | hCaptcha secret key (gizli) |
| `HCAPTCHA_SITE_KEY` | hCaptcha site key (herkese açık) |
| `PORT` | Node.js sunucu portu (varsayılan: 3020) |

