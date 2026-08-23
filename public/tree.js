(() => {
  "use strict";

  const VIEW_W = 900;
  const VIEW_H = 1000;
  const MAX_DEPTH = 8;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEED = 20260823;
  const MAX_VISIBLE_BLOSSOMS = 150;

  // Sakura blossom palette (Pastel Sakura, Pudra Pembe, Gül Kurusu, İpeksi Krem)
  const HUES = ["sakura", "pale", "accent", "cream"];
  const HUE_COLORS = {
    sakura: "#FCAEB8",
    pale: "#FFD1DC",
    accent: "#EB8298",
    cream: "#FFF2F5"
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
  function buildTree() {
    const segments = [];
    const roots = [];

    // 1. Organic Roots at base
    function makeRoot(x1, y1, angle, length, width) {
      const x2 = x1 + Math.sin(angle) * length;
      const y2 = y1 + Math.cos(angle) * length;
      const midX = (x1 + x2) / 2 + (rand() - 0.5) * 15;
      const midY = (y1 + y2) / 2;
      roots.push({ x1, y1, x2, y2, cx1: midX, cy1: midY, cx2: midX, cy2: midY, width });
    }

    makeRoot(VIEW_W / 2 - 8, VIEW_H - 25, -0.65, 55, 14);
    makeRoot(VIEW_W / 2 + 8, VIEW_H - 25, 0.65, 55, 14);
    makeRoot(VIEW_W / 2 - 4, VIEW_H - 25, -0.3, 35, 9);
    makeRoot(VIEW_W / 2 + 4, VIEW_H - 25, 0.3, 35, 9);

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
        const childWidth = width * 0.68;
        branch(x2, y2, childAngle, childLength, childWidth, depth + 1);
      }
    }

    // Trunk starts with majestic height and width
    branch(VIEW_W / 2, VIEW_H - 25, 0, 165, 24, 0);
    return { segments, roots };
  }

  const { segments: SEGMENTS, roots: ROOTS } = buildTree();

  /**
   * Meaningful dynamic tree growth stages based on wish count
   */
  function revealDepthForTotal(total) {
    if (total <= 0) return 4; // Majestic starter tree even with 0 wishes!
    if (total <= 8) return 5; // Sprouting young branches
    if (total <= 25) return 6; // Towering crown growth
    if (total <= 60) return 7; // Grand blossoming canopy
    return MAX_DEPTH; // Full ancient legendary sakura tree
  }

  function anchorsForDepth(revealDepth) {
    return SEGMENTS.filter((s) => s.depth <= revealDepth && (s.depth === revealDepth || s.isLeaf)).map(
      (s) => ({ x: s.x2, y: s.y2, depth: s.depth })
    );
  }

  function hashId(id) {
    const s = String(id);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
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

  const skyWishes = document.getElementById("sky-wishes");

  let currentRevealDepth = 4;
  let allWishes = [];
  let lastId = 0;

  const renderedBlossoms = new Map();
  const renderedStars = new Map();

  /**
   * Render roots, branches, and delicate branch leaves up to current reveal depth
   */
  function renderTreeStructure(revealDepth) {
    // 1. Render roots
    rootLayer.innerHTML = "";
    ROOTS.forEach((r) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${r.x1},${r.y1} C ${r.cx1},${r.cy1} ${r.cx2},${r.cy2} ${r.x2},${r.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", r.width);
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      rootLayer.appendChild(path);
    });

    // 2. Render branches
    branchLayer.innerHTML = "";
    SEGMENTS.filter((s) => s.depth <= revealDepth).forEach((s) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${s.x1},${s.y1} C ${s.cx1},${s.cy1} ${s.cx2},${s.cy2} ${s.x2},${s.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", Math.max(2.2, s.width));
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      branchLayer.appendChild(path);
    });

    // 3. Render delicate organic sakura leaves and blossom buds along branches
    leafLayer.innerHTML = "";
    const activeSegments = SEGMENTS.filter((s) => s.depth >= 3 && s.depth <= revealDepth);
    activeSegments.forEach((s, idx) => {
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const angleDeg = (angle * 180) / Math.PI;

      // Mid-branch delicate leaf pair
      const midX = (s.x1 + s.x2) / 2;
      const midY = (s.y1 + s.y2) / 2;

      // Leaf 1
      const leaf1 = document.createElementNS(SVG_NS, "ellipse");
      leaf1.setAttribute("cx", midX);
      leaf1.setAttribute("cy", midY);
      leaf1.setAttribute("rx", 6.5);
      leaf1.setAttribute("ry", 3.2);
      leaf1.setAttribute("class", idx % 2 === 0 ? "tree-leaf" : "tree-leaf-alt");
      leaf1.setAttribute("transform", `rotate(${angleDeg + 35} ${midX} ${midY})`);
      leafLayer.appendChild(leaf1);

      // Leaf 2 (opposite side)
      if (s.depth >= 4 && idx % 3 !== 0) {
        const leaf2 = document.createElementNS(SVG_NS, "ellipse");
        leaf2.setAttribute("cx", midX);
        leaf2.setAttribute("cy", midY);
        leaf2.setAttribute("rx", 5.5);
        leaf2.setAttribute("ry", 2.8);
        leaf2.setAttribute("class", "tree-leaf-alt");
        leaf2.setAttribute("transform", `rotate(${angleDeg - 40} ${midX} ${midY})`);
        leafLayer.appendChild(leaf2);
      }

      // Small blossom bud at branch junctions
      if (s.depth >= 4 && (idx % 2 === 0 || s.isLeaf)) {
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

    // Large visible scale (26px - 34px diameter)
    const scale = 1.6 + (hashId(wish.id) % 35) / 100;
    const petalColor = HUE_COLORS[hue] || "#ff5c8d";

    // Invisible generous hitbox for easy mobile tapping (42px)
    const hitbox = document.createElementNS(SVG_NS, "circle");
    hitbox.setAttribute("r", 21);
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

    const left = (hashId(wish.id) % 88 + 6);
    const top = (hashId(wish.id + 7) % 35 + 8);

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
          const anchor = anchors[anchorIdx];

          // Natural organic offset around branch tips
          const offsetX = (hashId(wish.id + 11) % 28) - 14;
          const offsetY = (hashId(wish.id + 17) % 28) - 14;

          const hue = HUES[hashId(wish.id + 1) % HUES.length];
          const blossom = makeBlossom(anchor.x + offsetX, anchor.y + offsetY, hue, wish);

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
          renderTreeAndStars(allWishes, false);
        } else {
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

  let canvasW = 0;
  let canvasH = 0;

  function resizePetalCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizePetalCanvas);
  setTimeout(resizePetalCanvas, 50);

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
    if (!canvasW || !canvasH) return canvasH - 40;
    // Normalized x from center (-1 at left edge, 0 at center, +1 at right edge)
    const nx = Math.max(-1, Math.min(1, (x - canvasW / 2) / (canvasW / 2)));
    // Parabolic mound shape: ~75px above bottom at center, ~35px at edges
    const hillElevation = Math.max(0, 1 - nx * nx) * 38;
    return canvasH - 35 - hillElevation;
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
        renderTreeAndStars(allWishes, false);
      } else {
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
