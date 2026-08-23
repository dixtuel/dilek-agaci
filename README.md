# Dilek Ağacı

[![Website](https://img.shields.io/badge/website-dilekagaci.dxtl.com.tr-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://dilekagaci.dxtl.com.tr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Pages%20%7C%20Node.js-black?style=flat-square)](https://dilekagaci.dxtl.com.tr)
[![Database](https://img.shields.io/badge/database-Turso%20(libSQL)-00E599?style=flat-square&logo=sqlite&logoColor=white)](https://turso.tech)

Bırakılan her dilekle birlikte yeni çiçeklerin açtığı ve dalların gökyüzüne uzandığı açık kaynaklı ortak dijital dilek ağacı platformu.

Sistem, hem **Cloudflare Pages / Functions (Edge / Serverless)** ortamında 0 ms cold start ile global CDN üzerinden, hem de standart **Node.js / Express (Docker, VPS, Render)** ortamında tam uyumlu olarak çalışacak hibrit bir mimariye sahiptir.

---

## Özellikler

- **Dinamik Fraktal Ağaç:** Matematiksel kübik Bézier eğrileriyle oluşturulan, toplam dilek sayısı arttıkça büyüyen ve dallanan SVG kanopi motoru.
- **Donanım Hızlandırmalı Yaprak Fiziği:** HTML5 Canvas üzerinde çalışan; kanopi dal uçlarından, tomurcuklardan ve çiçek merkezlerinden dökülüp çimen yüzeyine konan 60 FPS sakura taç yaprak simülasyonu.
- **Kozmik Yaşam Döngüsü (Cosmic Lifecycle):** Ağaç üzerinde belirli bir çiçek sınırına ulaşıldığında en eski dileklerin gökyüzüne süzülerek parıldayan birer yıldıza dönüştüğü dinamik arşiv mekanizması.
- **Çift Çalışma Modu (Dual Runtime):**
  - **Cloudflare Pages + Functions:** Statik önyüz sınırsız Cloudflare CDN'den sunulurken, `/api/wishes` rotası Edge Functions üzerinde bağımsız çalışır.
  - **Node.js + Express:** `server/server.js` üzerinden klasik sunucu veya konteyner ortamında çalıştırılabilir.
- **İki Katmanlı İçerik Moderasyonu:**
  - Yerel Türkçe kelime kara listesi ile hızlı ön eleme.
  - NVIDIA NIM (`llama-3.1-nemotron-safety-guard-8b-v3`) 23 kategorilik içerik güvenliği modeli.
  - hCaptcha entegrasyonu ile bot ve spam engelleme.
- **Turso libSQL & Şeffaf Sıkıştırma:** Veriler bulut SQLite altyapısında saklanır; Web Streams Deflate ve zlib ile metinler şeffaf olarak sıkıştırılır.

---

## Mimari ve Teknoloji Yığını

| Katman | Teknoloji / Servis | Açıklama |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript, HTML5 Canvas, SVG, CSS3 | Harici kütüphane bağımlılığı içermeyen saf önyüz |
| **Edge API** | Cloudflare Pages Functions | `functions/api/wishes.js` (0 ms Cold Start, Serverless) |
| **Node.js API** | Express, Helmet, CORS | `server/server.js` (Konteyner ve VPS dağıtımları için) |
| **Veritabanı** | Turso (libSQL / SQLite) | Kalıcı bulut SQLite veritabanı |
| **Moderasyon** | NVIDIA NIM API & Yerel Filtre | Yapay zekâ destekli içerik denetimi |
| **Bot Koruması** | hCaptcha | İstemci ve sunucu taraflı doğrulama |

---

## Kurulum ve Yerel Geliştirme

### 1. Depoyu Klonlama
```bash
git clone https://github.com/dixtuel/dilek-agaci.git
cd dilek-agaci
```

### 2. Bağımlılıkları Yükleme
```bash
npm install
```

### 3. Ortam Değişkenlerini Tanımlama
`.env.example` dosyasını `.env` olarak kopyalayın ve değişkenleri yapılandırın:
```bash
cp .env.example .env
```

### 4. Projeyi Başlatma

#### Seçenek A: Node.js ile Başlatma
```bash
npm start
# http://localhost:3020
```

#### Seçenek B: Cloudflare Pages / Wrangler ile Başlatma
```bash
npx wrangler pages dev public
```

---

## Dağıtım (Deployment)

### Yöntem 1: Cloudflare Pages (Önerilen)

1. Depoyu GitHub hesabınıza push edin.
2. [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git** adımlarını izleyin.
3. Dağıtım ayarlarını yapılandırın:
   - **Framework Preset:** `None`
   - **Build output directory:** `public`
   - **Root directory:** `/`
4. **Environment Variables** sekmesinden ilgili ortam değişkenlerini tanımlayın:
   - `CORS_ALLOWED_ORIGINS`
   - `HCAPTCHA_SITE_KEY`
   - `HCAPTCHA_SECRET`
   - `NIM_API_KEY`
   - `NIM_MODEL`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
5. **Save and Deploy** butonuna tıklayın.

### Yöntem 2: Docker / VPS / Render

Node.js ortamını destekleyen herhangi bir PaaS servisinde veya bağımsız Linux sunucusunda:
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** `3020` (veya `PORT` ortam değişkeni)

---

## Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
| :--- | :---: | :--- |
| `TURSO_DATABASE_URL` | Evet | Turso veritabanı bağlantı adresi (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Evet | Turso veritabanı erişim token'ı |
| `NIM_API_KEY` | Evet | NVIDIA build.nvidia.com API anahtarı |
| `NIM_MODEL` | Hayır | Moderasyon modeli (`nvidia/llama-3.1-nemotron-safety-guard-8b-v3`) |
| `HCAPTCHA_SITE_KEY` | Evet | hCaptcha genel site anahtarı (public) |
| `HCAPTCHA_SECRET` | Evet | hCaptcha gizli doğrulama anahtarı (secret) |
| `CORS_ALLOWED_ORIGINS`| Hayır | İzin verilen alan adları (`https://dilekagaci.dxtl.com.tr`) |
| `PORT` | Hayır | Node.js sunucu portu (varsayılan: `3020`) |

---

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında sunulmaktadır.  
Copyright (c) 2026 **dixtuel**.
