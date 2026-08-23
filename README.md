# Dilek Ağacı

[![Siteyi ziyaret et](https://img.shields.io/badge/dilekagaci.onrender.com-canlı_site-e8785a?style=for-the-badge&logo=googlechrome&logoColor=white)](https://dilekagaci.onrender.com)

Herkesin ortak gördüğü, dilek yazıldıkça çiçek açan bir dilek ağacı sitesi. Tek bir Node.js
servisi hem statik önyüzü hem de API'yi sunar; veritabanı Turso (bulut tabanlı, SQLite uyumlu)
olduğu için hangi ücretsiz Node barındırıcısına deploy edersen et veri kaybolmaz.

> Ücretsiz planda barındığı için site birkaç dakika boyunca istek almazsa uyur; ilk açılış
> isteği birkaç saniye gecikebilir, bu normaldir.

## Mimari — neden bu seçimler

- **Turso (libSQL)**: çoğu ücretsiz PaaS (Render, Railway vb.) diskin kalıcı olmadığı "ephemeral
  filesystem" modeliyle çalışır — yerel bir SQLite dosyası her deploy/restart'ta silinir. Turso
  bulutta kalıcı, SQLite uyumlu, ücretsiz katmanı (500 veritabanı, 9GB depolama, ayda 25M okuma)
  bu sorunu ortadan kaldırır.
- **hCaptcha**: form spam/bot koruması. Sitekey herkese açık (HTML'e gömülür), secret sadece
  sunucuda `.env`'de kalır.
- **NVIDIA NIM (Nemotron)**: Llama Guard'ın Türkçe resmi desteği olmadığı için, Türkçe talimat
  takibi yapabilen genel amaçlı bir Nemotron modeline moderasyon promptu veriyoruz. Bunun öncesinde
  ücretsiz bir yerel kara liste (`server/wordlist.js`, kaynak:
  [ooguz/turkce-kufur-karaliste](https://github.com/ooguz/turkce-kufur-karaliste), CC BY-SA 4.0)
  hızlı ilk filtre olarak çalışır.
- **Fail-closed moderasyon**: NIM API'ye ulaşılamazsa dilek reddedilir — düşük trafikli bir site
  için içerik riskini erişilebilirliğe tercih etmek daha güvenli.

## 1) Hesapları aç ve anahtarları al

### Turso (veritabanı) — ücretsiz
```bash
curl -sSfL https://get.tur.so/install.sh | bash   # Turso CLI kurulumu
turso auth login                                  # tarayıcıdan giriş
turso db create dilek-agaci                       # veritabanını oluştur
turso db show dilek-agaci --url                   # → TURSO_DATABASE_URL
turso db tokens create dilek-agaci                # → TURSO_AUTH_TOKEN
```
(CLI kullanmak istemezsen [turso.tech](https://turso.tech) üzerinden tarayıcıyla da aynı işlemi
yapabilirsin — "Create Database" → "Generate Token".)

### hCaptcha (bot/spam koruması) — ücretsiz
1. [dashboard.hcaptcha.com](https://dashboard.hcaptcha.com) üzerinden ücretsiz hesap aç.
2. "New Site" ile bir site ekle, domain'i deploy sonrası gerçek adresle güncelleyebilirsin
   (geçici olarak `localhost` ile başlayabilirsin).
3. **Site Key**'i `HCAPTCHA_SITE_KEY`, **Secret Key**'i `HCAPTCHA_SECRET` olarak not al.

### NVIDIA NIM (içerik moderasyonu) — ücretsiz
1. [build.nvidia.com](https://build.nvidia.com) üzerinden ücretsiz hesap aç.
2. Bir modelin (ör. `nvidia/llama-3.1-nemotron-70b-instruct`) sayfasından "Get API Key" ile anahtar
   üret → `NIM_API_KEY`.

## 2) Ortam değişkenleri

`.env.example` dosyasını kopyala, gerçek değerlerle doldur (yerelde çalıştırmak için) — deploy
ederken bu değerleri hosting panelinin **Environment Variables** bölümüne aynı isimlerle gireceksin:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso veritabanı bağlantı adresi |
| `TURSO_AUTH_TOKEN` | Turso erişim token'ı |
| `NIM_API_KEY` | build.nvidia.com API anahtarı |
| `NIM_MODEL` | Kullanılacak model id (varsayılan yeterli) |
| `HCAPTCHA_SECRET` | hCaptcha secret key (gizli) |
| `HCAPTCHA_SITE_KEY` | hCaptcha site key (herkese açık, HTML'e gömülür) |
| `CORS_ALLOWED_ORIGINS` | Sitenin gerçek adresi (virgülle birden fazla girilebilir) |
| `PORT` | Sunucu portu (çoğu barındırıcı bunu kendi atar) |

## 3) Yerelde çalıştır

```bash
npm install
npm start
# http://localhost:3020
```

## 4) Ücretsiz deploy (örnek: Render)

1. Bu klasörü bir GitHub reposuna push et.
2. [render.com](https://render.com) → "New +" → "Web Service" → repoyu bağla.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Instance Type**: Free
6. **Environment** sekmesinden yukarıdaki tüm değişkenleri gir.
7. Deploy sonrası verilen `https://<servis-adı>.onrender.com` adresini hCaptcha panelindeki
   domain listesine ve `CORS_ALLOWED_ORIGINS`'e ekle, yeniden deploy et.

Kod herhangi bir Cloudflare/VDS'e özel bağlama (binding) kullanmadığı için Railway, Fly.io,
Cyclic gibi diğer Node destekleyen ücretsiz barındırıcılarda da aynı adımlarla çalışır.

## 5) Özel domain (opsiyonel, sonra)

İstersen barındırıcı tarafında verilen adresi mevcut Cloudflare hesabındaki bir alt alan adına
(örn. `dilek.dxtl.com.tr`) CNAME ile bağlayabilirsin — bu adım tamamen opsiyonel ve barındırıcı
seçimine göre değişir.
