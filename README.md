# 🌸 Dilek Ağacı

[![Canlı Site](https://img.shields.io/badge/Canlı_Site-dilekagaci.dxtl.com.tr-e8785a?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dilekagaci.dxtl.com.tr)
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare_Pages_%7C_Node.js-orange?style=for-the-badge)](https://dilekagaci.dxtl.com.tr)
[![Veritabanı](https://img.shields.io/badge/Veritabanı-Turso_(libSQL)-00E599?style=for-the-badge&logo=sqlite&logoColor=white)](https://turso.tech)

Dünyanın dört bir yanından insanların umutlarının buluştuğu, bırakılan her dilekle birlikte yeni çiçeklerin açtığı ve dalların gökyüzüne uzandığı **ortak dijital dilek ağacı**.

Site hem **Cloudflare Pages / Workers (Edge / Serverless)** mimarisiyle 0 ms Cold Start ile global CDN üzerinden, hem de klasik **Node.js / Express (Docker, VPS, Render)** ortamında tam uyumlu olarak çalışacak şekilde tasarlanmıştır.

---

## ✨ Öne Çıkan Özellikler

* **🌳 Dinamik ve Organik Fraktal Ağaç:** Matematiksel kübik Bézier eğrileriyle çizilen, dilek sayısı arttıkça büyüyen ve dallanan canlı SVG ağaç motoru.
* **🍃 60 FPS Donanım Hızlandırmalı Yaprak Fiziği:** HTML5 Canvas üzerinde çalışan; kanopi dal uçlarından, tomurcuklardan ve çiçeklerden dökülüp çimenin üzerine biriken gerçekçi sakura yaprakları.
* **🌌 Kozmik Yaşam Döngüsü (Cosmic Lifecycle):** Ağaçta belirli bir çiçek yoğunluğuna ulaşıldığında, en eski dilekler gökyüzüne süzülerek parıldayan birer yıldıza dönüşür.
* **⚡ Çift Çalışma Modu (Dual Runtime):** 
  * **Cloudflare Pages + Functions:** Statik sayfalar sınırsız ve ücretsiz Cloudflare CDN'inden sunulurken, API uç noktası global Edge üzerinde anında yanıt verir.
  * **Node.js + Express:** `server/server.js` üzerinden herhangi bir sunucu veya Docker konteynerinde bağımsız çalışabilir.
* **🛡️ İki Kademeli Akıllı İçerik Moderasyonu:**
  * **1. Katman:** Yerel Türkçe kelime filtresi ile anında hızlı eleme.
  * **2. Katman:** NVIDIA NIM (`llama-3.1-nemotron-safety-guard-8b-v3`) 23 kategorilik yapay zekâ güvenlik modeli.
  * **Bot Koruması:** hCaptcha entegrasyonu ile otomatik spam engelleme.
* **💾 Turso libSQL & Şeffaf Sıkıştırma:** Veriler bulut SQLite veritabanında saklanır; Web Streams Deflate / Node.js zlib ile şeffaf olarak sıkıştırılarak minimum ağ ve disk alanı tüketilir.

---

## 🛠️ Mimari ve Teknoloji Yığını

| Katman | Teknoloji / Servis | Açıklama |
| :--- | :--- | :--- |
| **Önyüz (Frontend)** | Vanilla JS, HTML5 Canvas, SVG, CSS3 | Sıfır harici kütüphane, saf performans ve 60 FPS akıcılık |
| **Edge API** | Cloudflare Pages Functions | `functions/api/wishes.js` (0 ms Cold Start, sunucusuz) |
| **Node.js API** | Express, Helmet, CORS | `server/server.js` (Konteyner ve VPS dağıtımları için) |
| **Veritabanı** | Turso (libSQL / SQLite) | Kalıcı bulut veritabanı |
| **Moderasyon** | NVIDIA NIM API & Yerel Filtre | Llama 3.1 Safety Guard tabanlı içerik denetimi |
| **Bot Koruması** | hCaptcha | İstemci ve sunucu taraflı token doğrulama |

---

## 🚀 Kurulum ve Yerel Geliştirme

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/dixtuel/dilek-agaci.git
cd dilek-agaci
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Tanımlayın
`.env.example` dosyasını `.env` olarak kopyalayın ve gerekli anahtarları doldurun:
```bash
cp .env.example .env
```

### 4. Projeyi Başlatın

#### Seçenek A: Node.js ile Başlatma
```bash
npm start
# http://localhost:3020 adresinden erişilebilir.
```

#### Seçenek B: Cloudflare Pages / Wrangler ile Başlatma
```bash
npx wrangler pages dev public
```

---

## 🌐 Dağıtım (Deployment)

### Yöntem 1: Cloudflare Pages (Önerilen)

1. Bu depoyu GitHub hesabınıza push edin.
2. [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git** seçeneğine tıklayın.
3. Proje ayarlarını yapın:
   * **Framework Preset:** `None`
   * **Build output directory:** `public`
   * **Root directory:** `/`
4. **Environment Variables** bölümüne aşağıdaki değişkenleri ekleyin:
   * `CORS_ALLOWED_ORIGINS`
   * `HCAPTCHA_SITE_KEY`
   * `HCAPTCHA_SECRET`
   * `NIM_API_KEY`
   * `NIM_MODEL`
   * `TURSO_DATABASE_URL`
   * `TURSO_AUTH_TOKEN`
5. **Save and Deploy** butonuna tıklayın.

### Yöntem 2: Docker / VPS / Render

Node.js ortamını destekleyen herhangi bir PaaS servisinde (Render, Railway, Fly.io vb.) veya kendi Linux sunucunuzda:
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Port:** `3020` (veya sunucunun atadığı `PORT`)

---

## 🔐 Ortam Değişkenleri Referansı

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

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.  
Telif Hakkı (c) 2026 **Asrın Kılıç (dixtuel)**.
