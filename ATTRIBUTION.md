# Açık Kaynak Lisans ve Atıf Bildirimleri (Attribution)

Bu belge, **Dilek Ağacı** projesinde doğrudan veya dolaylı olarak kullanılan açık kaynaklı yazılımları, kütüphaneleri, fontları, simgeleri ve matematiksel/grafiksel algoritmaları listeler. Tüm bileşenlerin telif hakları ilgili hak sahiplerine aittir.

---

## 1. Doğrudan Bağımlılıklar ve Kütüphaneler

### [@libsql/client (Turso)](https://turso.tech)
- **Kullanım:** Bulut SQLite / libSQL veritabanı istemcisi (`server/server.js`).
- **Lisans:** MIT Lisansı
- **Telif Hakkı:** Copyright (c) ChiselStrike, Inc.
- **Web Sitesi:** https://github.com/tursodatabase/libsql-client-ts

### [Express](https://expressjs.com/)
- **Kullanım:** Alternatif Node.js HTTP sunucusu ve API yönlendirme katmanı (`server/server.js`).
- **Lisans:** MIT Lisansı
- **Telif Hakkı:** Copyright (c) StrongLoop, Inc., and other expressjs.com contributors
- **Web Sitesi:** https://github.com/expressjs/express

### [compression](https://github.com/expressjs/compression)
- **Kullanım:** Node.js Express yanıtlarının Gzip sıkıştırması.
- **Lisans:** MIT Lisansı
- **Telif Hakkı:** Copyright (c) 2014 Jonathan Ong, Douglas Christopher Wilson

### [dotenv](https://github.com/motdotla/dotenv)
- **Kullanım:** Ortam değişkenlerinin yönetimi.
- **Lisans:** BSD-2-Clause Lisansı
- **Telif Hakkı:** Copyright (c) 2015, Mot / Scott Motte

---

## 2. Dış Servisler ve API'lar

### [hCaptcha](https://www.hcaptcha.com/)
- **Kullanım:** Bot engelleme ve istenmeyen dilek spam'lerini durdurma (`functions/api/wishes.js`, `server/server.js`).
- **Telif Hakkı:** Intuition Machines, Inc.
- **Gizlilik:** [hCaptcha Gizlilik Politikası](https://www.hcaptcha.com/privacy)

### [NVIDIA NIM AI Safety Guard](https://build.nvidia.com/)
- **Kullanım:** Çok kategorili yapay zekâ destekli içerik denetimi (`llama-3.1-nemotron-safety-guard-8b-v3`).
- **Lisans:** NVIDIA AI Foundation Model License
- **Telif Hakkı:** NVIDIA Corporation

### [Cloudflare Pages & Functions](https://pages.cloudflare.com/)
- **Kullanım:** 0 ms cold start sunucusuz Edge API (`functions/api/wishes.js`) ve küresel statik CDN barındırma.
- **Telif Hakkı:** Cloudflare, Inc.

---

## 3. Tipografi ve Yazı Tipleri (Google Fonts)

### [Italianno](https://fonts.google.com/specimen/Italianno)
- **Kullanım:** Logo kaligrafisi ve imza tipografisi.
- **Lisans:** SIL Open Font License 1.1
- **Telif Hakkı:** Copyright (c) 2011, Robert E. Leuschke (robleuschke@yahoo.com)

### [Inter](https://fonts.google.com/specimen/Inter)
- **Kullanım:** Arayüz metinleri, butonlar, modallar ve sayaçlar.
- **Lisans:** SIL Open Font License 1.1
- **Telif Hakkı:** Copyright (c) 2016-2020, Rasmus Andersson (rasmus@rsms.me)

---

## 4. Matematiksel & Grafiksel Algoritmalar

### Kübik Bézier Fraktal Kanopi Motoru
- **Kullanım:** SVG tabanlı dallanma ve ağaç kanopisinin dinamik hesaplanması (`public/tree.js`).
- **Açıklama:** Matematiksel kübik Bézier eğrileri ve fraktal derinlik algoritmasıyla toplam dilek sayısına göre büyüyen dinamik fraktal ağaç yapısı.

### HTML5 Canvas Sakura Taç Yaprak Simülasyonu
- **Kullanım:** Donanım hızlandırmalı 60 FPS parçacık fiziği (`public/tree.js` - `#petals-canvas`).
- **Açıklama:** W3C standart `svg.getScreenCTM()` matris dönüşümü ile SVG dal uçlarından ve çiçek merkezlerinden doğan; yerçekimi, rüzgâr sapması ve parabolik çim yüzeyine (`getGrassSurfaceY`) konma fiziği.

### Web Streams / zlib Şeffaf Metin Sıkıştırması
- **Kullanım:** `functions/api/wishes.js` ve `server/server.js` üzerinde `z64:` önekli sıkıştırılmış dilek saklama formatı.
- **Açıklama:** Standart Web `CompressionStream('deflate')` ve Node.js `zlib.deflateSync` uyumlu veri minimizasyonu.

---

## 5. Lisans Bildirimi

Yukarıda listelenen bileşenlerin kendi lisans koşulları saklı kalmak kaydıyla, Dilek Ağacı kaynak kodunun tamamı **[MIT Lisansı](LICENSE)** ile lisanslanmıştır.
