(() => {
  "use strict";

  // Referans wish-tree görsellerine göre büyütüldü (2026-08-23): önceki
  // 900x1000 canvas'ta ağaç yalnızca ~65-70% yüksekliği dolduruyordu, üstte
  // boş gökyüzü kalıyordu ve gövde/dallar ince kalıyordu. Şimdi tuvalin
  // ~86-93%'ünü dolduran, daha kalın gövdeli/dallı bir ağaç için ayarlandı.
  const VIEW_W = 1050;
  const VIEW_H = 950;
  const MAX_DEPTH = 8;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEED = 20260823;
  const MAX_VISIBLE_BLOSSOMS = 150;

  // Dilek çiçekleri: dallardaki dekoratif yaprak/tomurcuklarla (--sakura-*,
  // style.css) AYNI paletin belirgin şekilde KOYU tonları — böylece asıl
  // dilekler arka plan dokusuna karışmadan öne çıkıyor, tıklanabilir olduğu
  // görsel olarak da belli oluyor.
  const HUES = ["sakura", "pale", "accent", "cream"];
  const HUE_COLORS = {
    sakura: "#E24A72",
    pale: "#D66C8E",
    accent: "#B03159",
    cream: "#C97C93"
  };

  /**
   * Deterministic Mulberry32 PRNG
   */
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(SEED);

  /**
   * Builds the majestic organic tree with roots, branches and wide canopy
   */
  // Gövde/kök başlangıç noktası — .ground-terrain overlay'i (CSS'te negatif
  // margin ile tree-wrap'in altını kaplar) kökleri gizlemesin diye zeminden
  // belirgin bir pay bırakır (önceki VIEW_H-25 neredeyse tamamen overlay'in
  // altında kalıyor, kökler görünmüyordu).
  const GROUND_Y = VIEW_H - 55;

  function buildTree() {
    const segments = [];
    const roots = [];

    // 1. Organic Roots at base — gerçek bir sakura gövdesinin taban çıkıntısı
    // (root flare) gibi: 2 uzun ana kök + 2 orta + 2 kısa/geniş yüzey kökü.
    function makeRoot(x1, y1, angle, length, width) {
      const x2 = x1 + Math.sin(angle) * length;
      const y2 = y1 + Math.cos(angle) * length;
      const midX = (x1 + x2) / 2 + (rand() - 0.5) * 15;
      const midY = (y1 + y2) / 2;
      roots.push({ x1, y1, x2, y2, cx1: midX, cy1: midY, cx2: midX, cy2: midY, width });
    }

    makeRoot(VIEW_W / 2 - 11, GROUND_Y, -0.68, 82, 24);
    makeRoot(VIEW_W / 2 + 11, GROUND_Y, 0.68, 82, 24);
    makeRoot(VIEW_W / 2 - 6, GROUND_Y, -0.32, 52, 15);
    makeRoot(VIEW_W / 2 + 6, GROUND_Y, 0.32, 52, 15);
    makeRoot(VIEW_W / 2 - 3, GROUND_Y, -0.12, 30, 10);
    makeRoot(VIEW_W / 2 + 3, GROUND_Y, 0.12, 30, 10);

    // 2. Majestic Branching Tree
    function branch(x1, y1, angle, length, width, depth) {
      const x2 = x1 + Math.sin(angle) * length;
      const y2 = y1 - Math.cos(angle) * length;

      // Natural curved control points
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const perpX = Math.cos(angle);
      const perpY = Math.sin(angle);
      const bendStrength = length * 0.24 * (rand() - 0.5);

      const offX = midX + perpX * bendStrength;
      const offY = midY + perpY * bendStrength;

      const cx1 = x1 + (offX - x1) * 0.36;
      const cy1 = y1 + (offY - y1) * 0.36;
      const cx2 = offX + (x2 - offX) * 0.36;
      const cy2 = offY + (y2 - offY) * 0.36;

      const isLeaf = depth >= MAX_DEPTH;
      segments.push({ x1, y1, x2, y2, cx1, cy1, cx2, cy2, depth, width, isLeaf });

      if (isLeaf) return;

      const childCount = depth < 2 ? 2 : (rand() > 0.35 ? 2 : 3);
      const spread = depth < 3 ? 0.5 + rand() * 0.2 : 0.44 + rand() * 0.3;

      for (let i = 0; i < childCount; i++) {
        const t = childCount === 1 ? 0 : i / (childCount - 1) - 0.5;
        const childAngle = angle + t * spread * 2 + (rand() - 0.5) * 0.15;
        const childLength = length * (depth < 3 ? 0.78 + rand() * 0.08 : 0.72 + rand() * 0.1);
        const childWidth = width * 0.74;
        branch(x2, y2, childAngle, childLength, childWidth, depth + 1);
      }
    }

    // Trunk starts with majestic height and width
    branch(VIEW_W / 2, GROUND_Y, 0, 205, 40, 0);
    return { segments, roots };
  }

  const { segments: SEGMENTS, roots: ROOTS } = buildTree();

  /**
   * Meaningful dynamic tree growth stages based on wish count
   */
  // Büyüme kademeleri: diğer online wish-tree sitelerinde (Yoko Ono Wish
  // Tree, Hirshhorn, eyalohana Digital Wishing Tree) bu tür bir "kademeli
  // büyüme" mekaniği yok — hepsi ya tüm dilekleri direkt gösteriyor ya da
  // tamamen algoritmik üretiyor, somut bir emsal bulunamadı. Bu yüzden
  // kendi mantığımızla tasarlandı: ilk dilek(ler) HEMEN belirgin bir
  // büyüme hissettirsin (ilk ziyaretçi motive olsun), ama tavana (MAX_DEPTH)
  // çok hızlı ulaşılmasın — ağaç uzun süre "hâlâ büyüyor" hissi versin.
  // Her kademe bir öncekinden daha fazla dilek gerektirir (yavaşlayan
  // büyüme eğrisi) — bu, dal uzunluğunun her derinlikte de küçülmesiyle
  // (childLength *= ~0.75) birleşince ağaç GÖĞE UZAMAK yerine giderek
  // daha ÇOK DALLANIR/BUDAKLANIR (marjinal yükseklik katkısı azalırken
  // dal sayısı katlanarak artar).
  function revealDepthForTotal(total) {
    if (total <= 0) return 4; // Görkemli bir başlangıç ağacı, 0 dilekte bile
    if (total <= 20) return 5;
    if (total <= 60) return 6;
    if (total <= 150) return 7;
    return MAX_DEPTH; // ~150+ dilekte tam olgun, efsanevi ağaç
  }

  // Gövdeye/köke en yakın ilk birkaç derinlik (0: gövde, 1-2: ilk kalın
  // çatallanma) dilek anchor'ı OLAMAZ — gerçek bir sakura çiçeği ana gövde
  // veya kalın ilk dallanmada değil, incelen dallarda açar. Yalnızca bu
  // eşiğin ÜSTÜNDEKİ dallar aday anchor olur (dal ucunda olma zorunluluğu
  // yine yok, ama gövdeye yapışık da olamaz).
  const MIN_BLOSSOM_ANCHOR_DEPTH = 3;

  function anchorsForDepth(revealDepth) {
    return SEGMENTS.filter((s) => s.depth >= MIN_BLOSSOM_ANCHOR_DEPTH && s.depth <= revealDepth).map(
      (s) => ({ x: s.x2, y: s.y2, depth: s.depth })
    );
  }

  /**
   * FNV-1a + Murmur3 finalizer (avalanche mixing). Basit bir polinom hash
   * (örn. h*31+c) ardışık küçük tam sayı ID'lerde (1,2,3...) neredeyse
   * ardışık çıktılar üretir — DFS sırasıyla dizilmiş SEGMENTS dizisinde
   * ardışık index'ler uzamsal olarak da bitişik olduğundan, dilekler
   * dalın tek bir küçük bölgesinde yığılıyordu. Finalizer karıştırması
   * küçük girdi farklarını da büyük, öngörülemez çıktı farklarına çevirir.
   */
  function hashId(id) {
    const s = String(id);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return Math.abs(h);
  }

  const MINI_BLOSSOM_SVG = `<svg class="mini-blossom-svg" viewBox="0 0 24 24" width="17" height="17"><g transform="translate(12,12)"><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#FCAEB8" transform="rotate(0)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#FFD1DC" transform="rotate(72)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#FCAEB8" transform="rotate(144)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#FFD1DC" transform="rotate(216)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#FCAEB8" transform="rotate(288)"/><circle cx="0" cy="0" r="2.2" fill="#FFF2F5"/></g></svg>`;
  const MINI_STAR_SVG = `<svg class="mini-star-svg" viewBox="0 0 16 16" width="14" height="14" style="vertical-align:middle;margin:0 2px;"><path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5Z" fill="#E8E6F0"/></svg>`;

  const IS_EN = document.documentElement.lang === "en" || window.location.pathname.startsWith("/en");

  const I18N = {
    tr: {
      guest: "— Bir Ziyaretçi",
      emptyTree: "ağaç henüz sessiz, ilk dileği sen bırak",
      treeOnly: (total) => `bu ağaçta <strong>${total}</strong> dilek çiçek açtı`,
      treeAndStars: (treeCount, starCount) => `<strong>${treeCount}</strong> çiçek • ${MINI_STAR_SVG} <strong>${starCount}</strong> yıldız`,
      wishLabel: (name, text) => (name ? `${name}: ${text}` : `Dilek: ${text}`),
      submitting: "Ağaca asılıyor…",
      submitBtn: "Ağaca As",
      errorShort: "Dileğin biraz daha uzun olmalı.",
      errorCaptcha: "Lütfen doğrulamayı tamamla.",
      errorGeneric: "Bir şeyler ters gitti, tekrar dene.",
      errorNetwork: "Bağlantı kurulamadı, tekrar dene.",
      timeJustNow: "az önce",
      timeMinutesAgo: (m) => `${m} dk önce`,
      timeHoursAgo: (h) => `${h} saat önce`,
      timeYesterday: "dün",
      timeDaysAgo: (d) => `${d} gün önce`,
    },
    en: {
      guest: "— A Visitor",
      emptyTree: "the tree is quiet, be the first to leave a wish",
      treeOnly: (total) => `<strong>${total}</strong> wishes blooming on this tree`,
      treeAndStars: (treeCount, starCount) => `<strong>${treeCount}</strong> blossoms • ${MINI_STAR_SVG} <strong>${starCount}</strong> stars`,
      wishLabel: (name, text) => (name ? `${name}: ${text}` : `Wish: ${text}`),
      submitting: "Hanging on tree…",
      submitBtn: "Hang on Tree",
      errorShort: "Your wish should be a little longer.",
      errorCaptcha: "Please complete the verification.",
      errorGeneric: "Something went wrong, please try again.",
      errorNetwork: "Could not connect, please try again.",
      timeJustNow: "just now",
      timeMinutesAgo: (m) => `${m}m ago`,
      timeHoursAgo: (h) => `${h}h ago`,
      timeYesterday: "yesterday",
      timeDaysAgo: (d) => `${d}d ago`,
    }
  };

  const t = IS_EN ? I18N.en : I18N.tr;

  function timeAgo(dateInput) {
    if (!dateInput) return "";
    const diff = Date.now() - new Date(dateInput).getTime();
    if (isNaN(diff)) return "";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.timeJustNow;
    if (mins < 60) return t.timeMinutesAgo(mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t.timeHoursAgo(hours);
    const days = Math.floor(hours / 24);
    if (days === 1) return t.timeYesterday;
    return t.timeDaysAgo(days);
  }

  // --- SVG Tree Layers ---
  const svg = document.getElementById("tree-svg");
  const rootLayer = document.createElementNS(SVG_NS, "g");
  const branchLayer = document.createElementNS(SVG_NS, "g");
  const leafLayer = document.createElementNS(SVG_NS, "g");
  const blossomLayer = document.createElementNS(SVG_NS, "g");

  svg.appendChild(rootLayer);
  svg.appendChild(branchLayer);
  svg.appendChild(leafLayer);
  svg.appendChild(blossomLayer);

  // Kanopi dolgusu için gerçek, küçük 5 yapraklı sakura çiçeği sembolü —
  // önceki bulanık/opak "leke" denemesi gerçek bir çiçeğe benzemiyordu.
  // Bu sembol MINI_BLOSSOM_SVG ile aynı, kanıtlanmış geometriyi kullanır;
  // <use> ile binlerce kez ucuza (tek element/kopya) tekrarlanabilir.
  const defs = svg.querySelector("defs") || svg.appendChild(document.createElementNS(SVG_NS, "defs"));
  const miniSymbol = document.createElementNS(SVG_NS, "symbol");
  miniSymbol.setAttribute("id", "mini-sakura-symbol");
  miniSymbol.setAttribute("viewBox", "-8 -8 16 16");
  miniSymbol.innerHTML =
    '<ellipse cx="0" cy="-3.2" rx="2.1" ry="3.1" fill="#FCAEB8" transform="rotate(0)"/>' +
    '<ellipse cx="0" cy="-3.2" rx="2.1" ry="3.1" fill="#FFD1DC" transform="rotate(72)"/>' +
    '<ellipse cx="0" cy="-3.2" rx="2.1" ry="3.1" fill="#FCAEB8" transform="rotate(144)"/>' +
    '<ellipse cx="0" cy="-3.2" rx="2.1" ry="3.1" fill="#FFD1DC" transform="rotate(216)"/>' +
    '<ellipse cx="0" cy="-3.2" rx="2.1" ry="3.1" fill="#FCAEB8" transform="rotate(288)"/>' +
    '<circle cx="0" cy="0" r="1.5" fill="#FFF2F5"/>';
  defs.appendChild(miniSymbol);

  const skyWishes = document.getElementById("sky-wishes");

  let currentRevealDepth = 4;
  let allWishes = [];
  let lastId = 0;

  const renderedBlossoms = new Map();
  const renderedStars = new Map();

  // Çakışma önleme: aynı anchor'a düşen blossom'lar altın-açı (golden-angle)
  // spiraliyle birbirinden ayrılır (her aynı anchor'a düşüşte yarıçap büyür,
  // açı 137.5°'lik sabit adımla döner) — rastgele jitter yerine garantili
  // ayrım sağlar. Gökyüzü yıldızları için de aynı mantıkla, mevcut yıldızlara
  // olan minimum mesafeyi garanti eden bir spiral arama uygulanır.
  const GOLDEN_ANGLE_RAD = 137.50776405003785 * (Math.PI / 180);
  const anchorUsage = new Map(); // anchorIdx -> bu anchor'a kaç blossom düştü
  const blossomPositions = []; // { x, y } — yerleşmiş tüm blossom'ların gerçek piksel konumu
  const MIN_BLOSSOM_DIST = 24; // px — büyüyen dilek çiçeği boyutuna orantılı, çakışmayı önler

  /**
   * Bir wish için gerçekten boş (yakın komşusu olmayan) bir anchor+spiral
   * konumu bulur. Yalnız hash'in seçtiği tek anchor'a golden-angle spiraliyle
   * güvenmek yeterli değil — FARKLI anchor'lara düşen iki dilek de (özellikle
   * dal ucuna yakın sık dallanmış bölgelerde) birbirine çok yakın çıkabilir.
   * Bu yüzden gerçek piksel mesafesini kontrol edip gerekirse komşu
   * anchor'lara kayarız.
   */
  function findBlossomSpot(anchors, startIdx) {
    const maxAttempts = Math.min(anchors.length, 80);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const idx = (startIdx + attempt) % anchors.length;
      const anchor = anchors[idx];
      const k = anchorUsage.get(idx) || 0;
      const spiralAngle = k * GOLDEN_ANGLE_RAD;
      const spiralRadius = k === 0 ? 0 : Math.min(9 + k * 7, 70);
      const x = anchor.x + Math.cos(spiralAngle) * spiralRadius;
      const y = anchor.y + Math.sin(spiralAngle) * spiralRadius;
      const tooClose = blossomPositions.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_BLOSSOM_DIST);
      if (!tooClose || attempt === maxAttempts - 1) {
        anchorUsage.set(idx, k + 1);
        return { x, y };
      }
    }
    const anchor = anchors[startIdx];
    return { x: anchor.x, y: anchor.y };
  }
  const starPositions = []; // { left, top } (yüzde) — yerleşmiş yıldızların merkezleri
  const MIN_STAR_DIST_PCT = 7; // yüzde cinsinden minimum merkezler-arası mesafe

  /**
   * Render roots, branches, and delicate branch leaves up to current reveal depth
   */
  // Kalın gövde/kök/dallara ince, koyu, hafif kaydırılmış paralel bir
  // "kabuk oluğu" ekler — ağaç büyütüldükten sonra düz tek renkli gövde çok
  // yalın kalıyordu, bu doku onu kırar. Yalnız yeterince kalın segmentlerde
  // (ince dallarda gürültü yaratmaması için).
  function addBarkRidge(layer, seg, width) {
    if (width < 6) return;
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dy) || 1;
    const dist = width * 0.2;
    const ox = (-dy / len) * dist;
    const oy = (dx / len) * dist;
    const ridge = document.createElementNS(SVG_NS, "path");
    ridge.setAttribute(
      "d",
      `M ${seg.x1 + ox},${seg.y1 + oy} C ${seg.cx1 + ox},${seg.cy1 + oy} ${seg.cx2 + ox},${seg.cy2 + oy} ${seg.x2 + ox},${seg.y2 + oy}`
    );
    ridge.setAttribute("class", "bark-ridge");
    ridge.setAttribute("stroke-width", Math.max(1, width * 0.09));
    layer.appendChild(ridge);
  }

  // Gerçek kiraz ağacı kabuğunun karakteristik yatay lentisel çizgileri —
  // kalın gövde/dallar boyunca birkaç kısa, açık tonlu yatay tire.
  function addBarkLenticels(layer, seg, width, seed) {
    if (width < 8) return;
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const perpX = -uy, perpY = ux;
    const count = Math.min(5, Math.floor(width / 6));
    for (let i = 0; i < count; i++) {
      const t = 0.15 + (i / count) * 0.7 + (hashId(seed + i) % 10) / 100;
      const px = seg.x1 + dx * t;
      const py = seg.y1 + dy * t;
      const half = width * 0.24;
      const wobble = (hashId(seed + i * 3) % 10) / 10 - 0.5;
      const x1 = px + perpX * half + ux * wobble * 3;
      const y1 = py + perpY * half + uy * wobble * 3;
      const x2 = px - perpX * half - ux * wobble * 3;
      const y2 = py - perpY * half - uy * wobble * 3;
      const mark = document.createElementNS(SVG_NS, "line");
      mark.setAttribute("x1", x1);
      mark.setAttribute("y1", y1);
      mark.setAttribute("x2", x2);
      mark.setAttribute("y2", y2);
      mark.setAttribute("class", "bark-lenticel");
      mark.setAttribute("stroke-width", Math.max(0.8, width * 0.045));
      layer.appendChild(mark);
    }
  }

  function renderTreeStructure(revealDepth) {
    // 1. Render roots
    rootLayer.innerHTML = "";
    ROOTS.forEach((r, ri) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${r.x1},${r.y1} C ${r.cx1},${r.cy1} ${r.cx2},${r.cy2} ${r.x2},${r.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", r.width);
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      rootLayer.appendChild(path);
      addBarkRidge(rootLayer, r, r.width);
      addBarkLenticels(rootLayer, r, r.width, ri * 31 + 7);
    });

    // 2. Render branches
    branchLayer.innerHTML = "";
    SEGMENTS.filter((s) => s.depth <= revealDepth).forEach((s, si) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${s.x1},${s.y1} C ${s.cx1},${s.cy1} ${s.cx2},${s.cy2} ${s.x2},${s.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", Math.max(2.2, s.width));
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      branchLayer.appendChild(path);
      addBarkRidge(branchLayer, s, s.width);
      addBarkLenticels(branchLayer, s, s.width, si * 31 + 7);
    });

    renderFoliage(revealDepth, lastRenderedTotal);
  }

  // Büyüme eğrisindeki ara noktalar arasında DÜZ ÇİZGİSEL geçiş yapan bir
  // yoğunluk eğrisi — yalnızca revealDepth değiştiğinde değil, aynı evre
  // içinde her yeni dilekte de kanopi görünür şekilde dolgunlaşsın diye
  // (kullanıcı geri bildirimi: "ilk hali aşırı boş duruyor", bir sonraki
  // yapısal sıçramaya kadar 20-30 dilek boyunca hiçbir şey değişmiyordu).
  const FLOWER_DENSITY_CURVE = [
    { t: 0, v: 9 },
    { t: 20, v: 15 },
    { t: 60, v: 20 },
    { t: 150, v: 26 },
    { t: 400, v: 34 },
  ];

  function flowerBaseForTotal(total) {
    const pts = FLOWER_DENSITY_CURVE;
    if (total <= pts[0].t) return pts[0].v;
    for (let i = 1; i < pts.length; i++) {
      if (total <= pts[i].t) {
        const a = pts[i - 1], b = pts[i];
        const f = (total - a.t) / (b.t - a.t);
        return a.v + (b.v - a.v) * f;
      }
    }
    return pts[pts.length - 1].v;
  }

  let lastRenderedTotal = 0;

  /**
   * Dal uçlarındaki gerçek mini-sakura çiçeği kümeleri + ince yaprak/tomurcuk
   * dokusu. Yapısal dallardan (renderTreeStructure) AYRI tutulur çünkü bu,
   * yalnızca revealDepth değiştiğinde değil, her yeni dilekte (aynı evre
   * içinde bile) dilek sayısına göre sürekli/kademeli olarak yoğunlaşması
   * gereken tek katmandır — ucuz olduğundan her güncellemede yeniden
   * çizilebilir.
   */
  function renderFoliage(revealDepth, total) {
    lastRenderedTotal = total;
    leafLayer.innerHTML = "";

    // 3a. GERÇEK küçük sakura çiçekleri (mini-sakura sembolü, <use> ile).
    // Gerçek referans fotoğraflar (tam çiçek açmış sakura dalları) net
    // gösteriyor: çiçekler yalnız dal UCUNDA bir küme değil, dalın
    // TAMAMI boyunca o kadar yoğun ki dal çizgisi neredeyse tamamen
    // örtülüyor, yalnız ara ara koyu dal parçası görünüyor. Bu yüzden
    // çiçekler artık yalnız uç noktada değil, çiçeklenme bölgesindeki
    // (depth >= 3) HER segmentin tüm uzunluğu boyunca dağıtılıyor.
    const flowerBase = flowerBaseForTotal(total);
    const clusterRadius = 6 + flowerBase * 0.16;

    function placeFlower(cx, cy, seed) {
      const scale = 0.6 + (hashId(seed) % 50) / 100;
      const rot = hashId(seed + 1) % 360;
      const flower = document.createElementNS(SVG_NS, "use");
      flower.setAttribute("href", "#mini-sakura-symbol");
      flower.setAttribute("width", 16);
      flower.setAttribute("height", 16);
      flower.setAttribute("transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${scale.toFixed(2)}) rotate(${rot})`);
      flower.setAttribute("class", "mini-sakura-fill");
      leafLayer.appendChild(flower);
    }

    const bloomSegments = SEGMENTS.filter((s) => s.depth >= 3 && s.depth <= revealDepth);
    bloomSegments.forEach((s, si) => {
      // Dal ucuna yakın segmentler (isLeaf veya tam revealDepth) daha yoğun;
      // gövdeye yakın (depth 3-4) segmentler daha seyrek — gerçek ağaçta da
      // çiçeklenme dal uçlarına doğru yoğunlaşır.
      const depthFactor = 0.5 + (0.6 * (s.depth - 2)) / Math.max(1, revealDepth - 2);
      const perSegment = Math.max(3, Math.round(flowerBase * depthFactor * 0.85));

      // 1) Dalın TAMAMI boyunca dağılan çiçekler — dal çizgisini örter.
      for (let c = 0; c < perSegment; c++) {
        const t = 0.1 + (hashId(si * 13 + c + 1) % 88) / 100;
        const px = s.x1 + (s.x2 - s.x1) * t;
        const py = s.y1 + (s.y2 - s.y1) * t;
        const jitterAngle = (hashId(si * 7 + c + 2) % 360) * (Math.PI / 180);
        const jitterR = Math.sqrt((hashId(si * 11 + c + 3) % 100) / 100) * (clusterRadius * 0.55);
        placeFlower(px + Math.cos(jitterAngle) * jitterR, py + Math.sin(jitterAngle) * jitterR, si * 23 + c + 4);
      }

      // 2) Dal ucunda ekstra yoğun "pom-pom" kümesi (yalnız gerçek uç
      // segmentlerinde: isLeaf ya da tam revealDepth) — gerçek fotoğraflardaki
      // gibi dal uçları en yoğun, en dolu bloom noktası olsun.
      if (s.isLeaf || s.depth === revealDepth) {
        const tipCount = Math.max(4, Math.round(flowerBase * 0.7));
        for (let c = 0; c < tipCount; c++) {
          const jitterAngle = (hashId(si * 29 + c + 5) % 360) * (Math.PI / 180);
          const jitterR = Math.sqrt((hashId(si * 31 + c + 6) % 100) / 100) * clusterRadius;
          placeFlower(s.x2 + Math.cos(jitterAngle) * jitterR, s.y2 + Math.sin(jitterAngle) * jitterR, si * 37 + c + 7);
        }
      }
    });

    const activeSegments = SEGMENTS.filter((s) => s.depth >= 2 && s.depth <= revealDepth);
    activeSegments.forEach((s, idx) => {
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const angleDeg = (angle * 180) / Math.PI;

      function leafAt(t, rx, ry, rotOffset, cls) {
        const lx = s.x1 + (s.x2 - s.x1) * t;
        const ly = s.y1 + (s.y2 - s.y1) * t;
        const leaf = document.createElementNS(SVG_NS, "ellipse");
        leaf.setAttribute("cx", lx);
        leaf.setAttribute("cy", ly);
        leaf.setAttribute("rx", rx);
        leaf.setAttribute("ry", ry);
        leaf.setAttribute("class", cls);
        leaf.setAttribute("transform", `rotate(${angleDeg + rotOffset} ${lx} ${ly})`);
        leafLayer.appendChild(leaf);
      }

      // Dal boyunca 2-4 nokta: gövdeye yakın (depth 2-3) daha seyrek, dal
      // uçlarına (depth 4+) doğru daha sık ve dolgun.
      leafAt(0.5, 6.8, 3.3, 35, idx % 2 === 0 ? "tree-leaf" : "tree-leaf-alt");
      leafAt(0.5, 5.8, 2.9, -40, "tree-leaf-alt");

      if (s.depth >= 3) {
        leafAt(0.22, 5.2, 2.6, 50, "tree-leaf");
      }
      if (s.depth >= 4) {
        leafAt(0.78, 5.6, 2.7, -55, idx % 2 === 0 ? "tree-leaf-alt" : "tree-leaf");
      }

      // Small blossom bud at branch junctions — artık daha erken derinlikten
      // ve daha sık başlıyor.
      if (s.depth >= 3 && (idx % 2 === 0 || s.isLeaf)) {
        const bud = document.createElementNS(SVG_NS, "circle");
        bud.setAttribute("cx", s.x2);
        bud.setAttribute("cy", s.y2);
        bud.setAttribute("r", 2.6);
        bud.setAttribute("class", "tree-bud");
        leafLayer.appendChild(bud);

        const budCore = document.createElementNS(SVG_NS, "circle");
        budCore.setAttribute("cx", s.x2);
        budCore.setAttribute("cy", s.y2);
        budCore.setAttribute("r", 1.2);
        budCore.setAttribute("class", "tree-bud-core");
        leafLayer.appendChild(budCore);
      }
    });
  }

  // --- Wish Card Modal Dialog ---
  const wishCardDialog = document.getElementById("wish-card-dialog");
  const wishCardBackdrop = document.getElementById("wish-card-backdrop");
  const wishCardClose = document.getElementById("wish-card-close");
  const wishCardText = document.getElementById("wish-card-text");
  const wishCardWho = document.getElementById("wish-card-who");
  const wishCardWhen = document.getElementById("wish-card-when");

  function showWishCard(wish) {
    if (!wish) return;
    wishCardText.textContent = wish.text || "";
    wishCardWho.textContent = wish.name ? `— ${wish.name}` : t.guest;
    wishCardWhen.textContent = wish.created_at ? timeAgo(wish.created_at) : "";

    wishCardDialog.hidden = false;
    wishCardBackdrop.hidden = false;
  }

  function hideWishCard() {
    wishCardDialog.hidden = true;
    wishCardBackdrop.hidden = true;
  }

  wishCardClose.addEventListener("click", hideWishCard);
  wishCardBackdrop.addEventListener("click", hideWishCard);

  /**
   * Creates an organic 5-petal Sakura Blossom SVG group
   */
  function makeBlossom(x, y, hue, wish) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "blossom");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", t.wishLabel(wish.name, wish.text));

    // Gerçek dilekler (tıklanabilir) az sayıda olsa bile ağacın "dolu"
    // görünmesini sağlayan asıl unsur — dal ucundaki dekoratif mini
    // çiçeklerden belirgin şekilde daha büyük olmalı.
    const scale = 1.35 + (hashId(wish.id) % 35) / 100;
    const petalColor = HUE_COLORS[hue] || "#ff5c8d";

    // Görünmez, mobilde dokunmayı kolaylaştıran hitbox — büyüyen çiçeğe göre
    // orantılı genişletildi.
    const hitbox = document.createElementNS(SVG_NS, "circle");
    hitbox.setAttribute("r", 20);
    hitbox.setAttribute("fill", "transparent");
    g.appendChild(hitbox);

    // 5 Sakura petals
    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS(SVG_NS, "ellipse");
      petal.setAttribute("class", "petal");
      petal.setAttribute("cx", "0");
      petal.setAttribute("cy", -6.5 * scale);
      petal.setAttribute("rx", 3.9 * scale);
      petal.setAttribute("ry", 7.0 * scale);
      petal.setAttribute("fill", petalColor);
      petal.setAttribute("opacity", "0.95");
      petal.setAttribute("transform", `rotate(${i * 72})`);
      g.appendChild(petal);
    }

    // Soft pistil center
    const center = document.createElementNS(SVG_NS, "circle");
    center.setAttribute("r", 2.8 * scale);
    center.setAttribute("fill", "#FFF2F5");
    center.setAttribute("stroke", "#EB8298");
    center.setAttribute("stroke-width", "0.6");
    g.appendChild(center);

    // Click & Touch events to open wish card
    const onOpen = (e) => {
      e.stopPropagation();
      showWishCard(wish);
    };

    g.addEventListener("click", onOpen);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showWishCard(wish);
      }
    });

    return g;
  }

  /**
   * Creates a floating petal star button for sky
   */
  function placeStar(wish) {
    const star = document.createElement("button");
    star.className = "sky-star";

    let left = (hashId(wish.id) % 88 + 6);
    let top = (hashId(wish.id + 7) % 35 + 8);

    // Mevcut yıldızlara çok yakınsa, sabit bir spiral izleyerek en yakın
    // boş noktayı bul — tamamen dolu bir gökyüzünde bile üst üste binmeyi
    // engelleyip yalnızca sıkışıklığı azaltır (min mesafeyi gevşeterek çıkar).
    const seedAngle = hashId(wish.id + 31) % 360;
    let minDist = MIN_STAR_DIST_PCT;
    for (let pass = 0; pass < 2; pass++) {
      let placed = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        const tooClose = starPositions.some(
          (p) => Math.hypot(p.left - left, p.top - top) < minDist
        );
        if (!tooClose) { placed = true; break; }
        const angle = (seedAngle + attempt * 61) * (Math.PI / 180);
        const radius = 2 + attempt * 1.4;
        left = Math.max(6, Math.min(94, (hashId(wish.id) % 88 + 6) + Math.cos(angle) * radius));
        top = Math.max(8, Math.min(43, (hashId(wish.id + 7) % 35 + 8) + Math.sin(angle) * radius));
      }
      if (placed) break;
      minDist = minDist / 2; // gökyüzü doluysa asgari mesafeyi gevşet, yine de dağıt
    }
    starPositions.push({ left, top });

    star.style.left = `${left}%`;
    star.style.top = `${top}%`;

    const size = 16 + (hashId(wish.id + 13) % 6);
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    const delay = (hashId(wish.id + 21) % 4000) / 1000;
    star.style.animationDelay = `${delay}s`;
    star.setAttribute("aria-label", t.wishLabel(wish.name, wish.text));

    star.addEventListener("click", (e) => {
      e.stopPropagation();
      showWishCard(wish);
    });

    return star;
  }

  /**
   * Renders blossoms on tree and stars in sky
   */
  function renderTreeAndStars(wishes, animateNew) {
    const starCount = Math.max(0, wishes.length - MAX_VISIBLE_BLOSSOMS);
    const starWishes = wishes.slice(0, starCount);
    const treeWishes = wishes.slice(starCount);

    const anchors = anchorsForDepth(currentRevealDepth);

    // 1. Ascend old blossoms to stars if over capacity
    for (const [id, blossom] of renderedBlossoms.entries()) {
      if (!treeWishes.find((w) => w.id === id)) {
        if (animateNew) {
          blossom.classList.add("ascending");
          setTimeout(() => blossom.remove(), 2200);
        } else {
          blossom.remove();
        }
        renderedBlossoms.delete(id);
      }
    }

    // 2. Place stars in sky
    starWishes.forEach((wish) => {
      if (!renderedStars.has(wish.id)) {
        const star = placeStar(wish);
        skyWishes.appendChild(star);
        renderedStars.set(wish.id, star);
      }
    });

    // 3. Place blossoms on tree
    if (anchors.length > 0) {
      treeWishes.forEach((wish) => {
        if (!renderedBlossoms.has(wish.id)) {
          const anchorIdx = hashId(wish.id) % anchors.length;
          const pos = findBlossomSpot(anchors, anchorIdx);
          blossomPositions.push(pos);

          const hue = HUES[hashId(wish.id + 1) % HUES.length];
          const blossom = makeBlossom(pos.x, pos.y, hue, wish);

          if (!animateNew) {
            blossom.style.animation = "none";
          }

          blossomLayer.appendChild(blossom);
          renderedBlossoms.set(wish.id, blossom);
        }
      });
    }

    updateCounter(treeWishes.length, starWishes.length, wishes.length);
  }

  function updateCounter(treeCount, starCount, total) {
    const counter = document.getElementById("counter");
    if (!counter) return;
    if (total <= 0) {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span>${t.emptyTree}</span>`;
    } else if (starCount <= 0) {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span>${t.treeOnly(total)}</span>`;
    } else {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span>${t.treeAndStars(treeCount, starCount)}</span>`;
    }
  }

  async function fetchWishes(since) {
    const res = await fetch(`/api/wishes?since=${since}&limit=500`);
    if (!res.ok) throw new Error("wishes fetch failed");
    return res.json();
  }

  async function poll(initial) {
    try {
      const { wishes, total } = await fetchWishes(initial ? 0 : lastId);

      let updated = false;

      if (initial) {
        allWishes = wishes;
        updated = true;
      } else if (wishes && wishes.length > 0) {
        const existingIds = new Set(allWishes.map((w) => w.id));
        const newUnique = wishes.filter((w) => !existingIds.has(w.id));
        if (newUnique.length > 0) {
          allWishes = [...allWishes, ...newUnique];
          updated = true;
        }
      }

      if (updated) {
        const nextRevealDepth = revealDepthForTotal(total);
        if (nextRevealDepth !== currentRevealDepth) {
          currentRevealDepth = nextRevealDepth;
          renderTreeStructure(currentRevealDepth);
          blossomLayer.innerHTML = "";
          renderedBlossoms.clear();
          anchorUsage.clear();
          blossomPositions.length = 0;
          renderTreeAndStars(allWishes, false);
        } else {
          // Derinlik değişmese bile yaprak/çiçek yoğunluğu her yeni dilekte
          // güncellensin — aynı evre içinde de görünür bir dolgunlaşma olsun.
          renderFoliage(currentRevealDepth, total);
          renderTreeAndStars(allWishes, !initial);
        }

        if (allWishes.length > 0) {
          lastId = allWishes[allWishes.length - 1].id;
        }
      } else {
        const starCount = Math.max(0, total - MAX_VISIBLE_BLOSSOMS);
        updateCounter(Math.min(total, MAX_VISIBLE_BLOSSOMS), starCount, total);
      }
    } catch (err) {
      console.warn("Dilek Ağacı: senkronizasyon hatası", err);
    }
  }

  // --- Hardware-Accelerated Falling Sakura Petals & Grass Accumulation Engine ---
  const canvas = document.getElementById("petals-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const groundSvgEl = document.querySelector(".ground-svg");

  let canvasW = 0;
  let canvasH = 0;
  // Çim çizgisinin canvas'ın ALT KENARINDAN gerçek uzaklığı (px) — .ground-svg'nin
  // gerçek DOM konumundan ölçülür. Mobilde ve masaüstünde ground-svg yüksekliği
  // farklı (85px vs 110px) olduğundan dinamik ölçüm kritik.
  let groundOffsetFromBottom = 35;

  function resizePetalCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (groundSvgEl) {
      const groundRect = groundSvgEl.getBoundingClientRect();
      // SVG viewBox="0 0 1200 140" — ön çim path'inin en üst noktası (Q kontrol
      // noktası y≈35) gerçek path üzerinde ~y=50 civarına denk gelir, yani
      // viewBox'ın ~%36'sı. Ama yaprakların optik olarak çimin üstüne oturması
      // için çim tepesinin biraz daha yukarısını hedefliyoruz (%22).
      const grassTopY = groundRect.top + groundRect.height * 0.22;
      groundOffsetFromBottom = Math.max(10, rect.bottom - grassTopY);
    }
  }

  window.addEventListener("resize", resizePetalCanvas);
  // Mobilde orientation değişiminde layout tamamen değişir
  window.addEventListener("orientationchange", () => {
    setTimeout(resizePetalCanvas, 150);
  });
  // İlk ölçümü DOM tamamen render olduktan sonra yap (fontlar, SVG layout vb.)
  setTimeout(resizePetalCanvas, 200);
  // Güvenlik ağı: layout kaymasını yakala (font yükleme, lazy content vb.)
  setTimeout(resizePetalCanvas, 800);
  // ResizeObserver ile stage veya ground-terrain boyut değişimlerini yakala
  if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
    const ro = new ResizeObserver(() => resizePetalCanvas());
    ro.observe(canvas.parentElement);
    if (groundSvgEl && groundSvgEl.parentElement) {
      ro.observe(groundSvgEl.parentElement);
    }
  }

  const activePetals = [];
  const groundPetals = [];
  const MAX_GROUND_PETALS = 18;
  let petalAnimationId = null;
  let lastSpawnTime = 0;

  /**
   * Generates comprehensive, high-precision anchor points across the entire active tree canopy:
   * 1. All branch end-tips (s.x2, s.y2) up to current depth
   * 2. All mid-branch foliage points (cubic Bezier curve midpoints)
   * 3. All currently rendered active blossom centers
   * This guarantees that whether the tree is young (depth 4) or towering (depth 8),
   * petals always spawn directly from visible leaves, buds and blossoms.
   */
  function getPetalSpawnPoints() {
    const points = [];
    const activeSegments = SEGMENTS.filter((s) => s.depth <= currentRevealDepth && s.depth >= 3);

    for (let i = 0; i < activeSegments.length; i++) {
      const s = activeSegments[i];
      // Branch tip
      points.push({ x: s.x2, y: s.y2 });

      // Cubic Bezier midpoint (t = 0.5)
      const midX = 0.125 * s.x1 + 0.375 * s.cx1 + 0.375 * s.cx2 + 0.125 * s.x2;
      const midY = 0.125 * s.y1 + 0.375 * s.cy1 + 0.375 * s.cy2 + 0.125 * s.y2;
      points.push({ x: midX, y: midY });
    }

    return points;
  }

  function spawnSinglePetal() {
    if (!canvasW || !canvasH) return;
    const spawnPoints = getPetalSpawnPoints();
    if (!spawnPoints || spawnPoints.length === 0) return;

    // Pick a point from canopy foliage or directly from a rendered blossom
    const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    let startX = 0;
    let startY = 0;

    // 100% exact SVG Screen Coordinate Transformation Matrix
    if (svg.getScreenCTM && svg.createSVGPoint) {
      const pt = svg.createSVGPoint();
      pt.x = point.x;
      pt.y = point.y;
      const screenPt = pt.matrixTransform(svg.getScreenCTM());
      const stageRect = canvas.getBoundingClientRect();
      startX = screenPt.x - stageRect.left;
      startY = screenPt.y - stageRect.top;
    } else {
      const svgRect = svg.getBoundingClientRect();
      const stageRect = canvas.getBoundingClientRect();
      startX = (svgRect.left - stageRect.left) + (point.x / VIEW_W) * svgRect.width;
      startY = (svgRect.top - stageRect.top) + (point.y / VIEW_H) * svgRect.height;
    }

    const petal = {
      startX,
      x: startX,
      y: startY,
      vy: 0.65 + Math.random() * 0.45, // Pure gravity downward (0.65 - 1.1 px/frame)
      swayFreq: 0.016 + Math.random() * 0.01,
      swayAmp: 10 + Math.random() * 10, // Gentle subtle wind drift
      baseAngle: (Math.random() - 0.5) * 0.6,
      flipSpeed: 0.02 + Math.random() * 0.018,
      size: 7.5 + Math.random() * 3.5, // 7.5px - 11px
      opacity: 0,
      t: 0,
      groundJitter: (Math.random() - 0.5) * 6, // Small natural grass variation (+-3px)
      landAngle: (Math.random() - 0.5) * 1.2,
      fading: false,
    };

    activePetals.push(petal);
  }

  /**
   * Calculates the exact surface Y elevation of the curved grass mound at horizontal position x
   */
  function getGrassSurfaceY(x) {
    if (!canvasW || !canvasH) return canvasH - groundOffsetFromBottom;
    // Normalized x from center (-1 at left edge, 0 at center, +1 at right edge)
    const nx = Math.max(-1, Math.min(1, (x - canvasW / 2) / (canvasW / 2)));
    // Hafif parabolic kavis: ground SVG path zaten organik tepe şeklinde,
    // buradaki hillElevation yalnızca yaprakların tam düz bir çizgiye değil
    // hafif doğal bir eğriye oturması için. Mobilde (dar ekran) daha küçük.
    const isMobile = canvasW < 640;
    const hillPeak = isMobile ? 8 : 14;
    const hillElevation = Math.max(0, 1 - nx * nx) * hillPeak;
    return canvasH - groundOffsetFromBottom - hillElevation;
  }

  function drawPetalShape(context, x, y, w, h, angle, opacity) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, -h / 2);
    context.bezierCurveTo(w, -h / 4, w, h / 4, 0, h / 2);
    context.bezierCurveTo(-w, h / 4, -w, -h / 4, 0, -h / 2);
    context.fillStyle = `rgba(255, 209, 220, ${opacity.toFixed(3)})`;
    context.fill();
    context.restore();
  }

  function updatePetalsPhysics() {
    if (!ctx || !canvasW || !canvasH) {
      petalAnimationId = requestAnimationFrame(updatePetalsPhysics);
      return;
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    const now = Date.now();
    // Steady natural spawn flow: every 550 - 750ms
    if (now - lastSpawnTime > 600 && activePetals.length < 8 && !document.hidden) {
      spawnSinglePetal();
      lastSpawnTime = now;
    }

    // 1. Draw and update ground accumulated petals
    for (let j = groundPetals.length - 1; j >= 0; j--) {
      const gp = groundPetals[j];
      if (gp.fading) {
        gp.opacity -= 0.012;
        if (gp.opacity <= 0) {
          groundPetals.splice(j, 1);
          continue;
        }
      }
      // Flat leaf resting exactly on curved grass surface
      drawPetalShape(ctx, gp.x, gp.y, gp.size * 0.85, gp.size * 0.45, gp.landAngle, gp.opacity);
    }

    // 2. Draw and update drifting petals in air
    for (let i = activePetals.length - 1; i >= 0; i--) {
      const p = activePetals[i];
      p.t++;

      // Gentle spawn fade-in at branch tip
      if (p.t < 14) {
        p.opacity = (p.t / 14) * 0.9;
      }

      p.y += p.vy;
      p.x = p.startX + Math.sin(p.t * p.swayFreq) * p.swayAmp;
      const angle = p.baseAngle + Math.sin(p.t * 0.022) * 0.35;
      const flip = p.t * p.flipSpeed;
      const w = p.size * (0.35 + Math.abs(Math.cos(flip)) * 0.65);
      const h = p.size * 1.25;

      // Exact grass mound surface height at this petal's horizontal x position
      const surfaceY = getGrassSurfaceY(p.x) + p.groundJitter;

      // Check landing on exact grass surface
      if (p.y >= surfaceY) {
        p.y = surfaceY;
        p.opacity = 0.75;
        groundPetals.push(p);
        activePetals.splice(i, 1);

        if (groundPetals.length > MAX_GROUND_PETALS) {
          const oldest = groundPetals.shift();
          oldest.fading = true;
        }
        continue;
      }

      drawPetalShape(ctx, p.x, p.y, w, h, angle, p.opacity);
    }

    if (!document.hidden) {
      petalAnimationId = requestAnimationFrame(updatePetalsPhysics);
    }
  }

  function startPetalsEngine() {
    if (petalAnimationId) cancelAnimationFrame(petalAnimationId);
    resizePetalCanvas();
    lastSpawnTime = Date.now() - 1500;
    petalAnimationId = requestAnimationFrame(updatePetalsPhysics);
  }

  // --- Smart & Adaptive Edge Request Optimization ---
  // Minimizes Cloudflare Worker/Function invocations while keeping real-time responsiveness.
  let pollTimeoutId = null;
  let lastUserActivity = Date.now();

  function markUserActive() {
    lastUserActivity = Date.now();
  }

  window.addEventListener("pointerdown", markUserActive, { passive: true });
  window.addEventListener("keydown", markUserActive, { passive: true });
  window.addEventListener("touchstart", markUserActive, { passive: true });

  function scheduleNextPoll() {
    if (document.hidden) return;
    if (pollTimeoutId) clearTimeout(pollTimeoutId);

    // Active user (interacted within 90s): poll every 25s
    // Idle/passive user (away > 90s): relax polling to 50s
    const isIdle = Date.now() - lastUserActivity > 90000;
    const delay = isIdle ? 50000 : 25000;

    pollTimeoutId = setTimeout(async () => {
      if (!document.hidden) {
        await poll(false);
        scheduleNextPoll();
      }
    }, delay);
  }

  // Initial draw: majestic roots, branches, and leaf buds
  renderTreeStructure(currentRevealDepth);
  startPetalsEngine();
  poll(true).then(() => scheduleNextPoll());

  // CPU, Battery & Quota Guard: Pause everything when tab is inactive
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
      if (petalAnimationId) {
        cancelAnimationFrame(petalAnimationId);
        petalAnimationId = null;
      }
    } else {
      markUserActive();
      startPetalsEngine();
      poll(false).then(() => scheduleNextPoll());
    }
  });

  // --- Wish Form Panel Controls ---
  const panel = document.getElementById("panel");
  const backdrop = document.getElementById("panel-backdrop");
  const openBtn = document.getElementById("open-form");
  const closeBtn = document.getElementById("panel-close");
  const form = document.getElementById("wish-form");
  const textArea = document.getElementById("text");
  const charCount = document.getElementById("char-count");
  const formError = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");

  function openPanel() {
    panel.hidden = false;
    backdrop.hidden = false;
    formError.hidden = true;
    setTimeout(() => textArea.focus(), 50);
  }

  function closePanel() {
    panel.hidden = true;
    backdrop.hidden = true;
    formError.hidden = true;
  }

  openBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  // Remember language choice when clicking TR / EN switchers
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.getAttribute("href") || "";
      const isEn = href.includes("/en");
      try {
        localStorage.setItem("preferred_lang", isEn ? "en" : "tr");
      } catch (_) {}
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!panel.hidden) closePanel();
      if (!wishCardDialog.hidden) hideWishCard();
    }
  });

  textArea.addEventListener("input", () => {
    charCount.textContent = String(textArea.value.length);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const text = String(data.get("text") || "").trim();
    const hcaptchaToken = String(data.get("h-captcha-response") || "");

    if (text.length < 2) {
      formError.textContent = t.errorShort;
      formError.hidden = false;
      return;
    }
    if (!hcaptchaToken) {
      formError.textContent = t.errorCaptcha;
      formError.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t.submitting;

    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, hcaptchaToken }),
      });
      const payload = await res.json();

      if (!res.ok) {
        formError.textContent = payload.error || t.errorGeneric;
        formError.hidden = false;
        return;
      }

      allWishes.push(payload.wish);
      lastId = Math.max(lastId, payload.wish.id);

      const total = payload.total;
      const nextRevealDepth = revealDepthForTotal(total);
      if (nextRevealDepth !== currentRevealDepth) {
        currentRevealDepth = nextRevealDepth;
        renderTreeStructure(currentRevealDepth);
        blossomLayer.innerHTML = "";
        renderedBlossoms.clear();
        anchorUsage.clear();
        blossomPositions.length = 0;
        renderTreeAndStars(allWishes, false);
      } else {
        renderFoliage(currentRevealDepth, total);
        renderTreeAndStars(allWishes, true);
      }

      form.reset();
      charCount.textContent = "0";
      closePanel();
    } catch (err) {
      formError.textContent = t.errorNetwork;
      formError.hidden = false;
    } finally {
      if (window.hcaptcha) {
        try {
          window.hcaptcha.reset();
        } catch (_) {
          // Widget might not be loaded
        }
      }
      submitBtn.disabled = false;
      submitBtn.textContent = t.submitBtn;
    }
  });

  // Expose TreeEngine debug hooks for testing and inspection
  window.__TreeEngine = {
    getPetalSpawnPoints,
    renderTreeStructure,
    setRevealDepth: (d) => {
      currentRevealDepth = d;
      renderTreeStructure(d);
    },
    getAnchors: () => anchorsForDepth(currentRevealDepth),
    getSegments: () => SEGMENTS,
    getActivePetals: () => activePetals,
    spawnSinglePetal,
  };
})();
