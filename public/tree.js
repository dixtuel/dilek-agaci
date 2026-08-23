(() => {
  "use strict";

  const VIEW_W = 900;
  const VIEW_H = 1000;
  const MAX_DEPTH = 8;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEED = 20260823;
  const MAX_VISIBLE_BLOSSOMS = 150;

  // Sakura blossom vibrant palette
  const HUES = ["sakura", "rose", "blush", "coral"];
  const HUE_COLORS = {
    sakura: "#ff5c8d",
    rose: "#ff7597",
    blush: "#ff85a2",
    coral: "#ff6b9d"
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

  function timeAgo(dateInput) {
    if (!dateInput) return "";
    const diff = Date.now() - new Date(dateInput).getTime();
    if (isNaN(diff)) return "";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "dün";
    return `${days} gün önce`;
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
    wishCardWho.textContent = wish.name ? `— ${wish.name}` : "— Bir Ziyaretçi";
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
    g.setAttribute("aria-label", wish.name ? `${wish.name}: ${wish.text}` : `Dilek: ${wish.text}`);

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

    // Golden center pistil
    const center = document.createElementNS(SVG_NS, "circle");
    center.setAttribute("r", 3.0 * scale);
    center.setAttribute("fill", "#f59e0b");
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
    star.setAttribute("aria-label", wish.name ? `${wish.name}: ${wish.text}` : `Dilek: ${wish.text}`);

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

  const MINI_BLOSSOM_SVG = `<svg class="mini-blossom-svg" viewBox="0 0 24 24" width="17" height="17"><g transform="translate(12,12)"><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#ff5c8d" transform="rotate(0)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#ff7597" transform="rotate(72)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#ff5c8d" transform="rotate(144)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#ff7597" transform="rotate(216)"/><ellipse cx="0" cy="-5" rx="3" ry="4.5" fill="#ff5c8d" transform="rotate(288)"/><circle cx="0" cy="0" r="2.2" fill="#f59e0b"/></g></svg>`;
  const MINI_STAR_SVG = `<svg class="mini-star-svg" viewBox="0 0 16 16" width="14" height="14" style="vertical-align:middle;margin:0 2px;"><path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5Z" fill="#f59e0b"/></svg>`;

  function updateCounter(treeCount, starCount, total) {
    const counter = document.getElementById("counter");
    if (!counter) return;
    if (total <= 0) {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span>ağaç henüz sessiz, ilk dileği sen bırak</span>`;
    } else if (starCount <= 0) {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span>bu ağaçta <strong>${total}</strong> dilek çiçek açtı</span>`;
    } else {
      counter.innerHTML = `${MINI_BLOSSOM_SVG} <span><strong>${treeCount}</strong> çiçek • ${MINI_STAR_SVG} <strong>${starCount}</strong> yıldız</span>`;
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
          initFallingPetals();
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

  /**
   * Initializes drifting / falling Sakura Petals originating organically from tree branches down to grass
   */
  function initFallingPetals() {
    const container = document.getElementById("falling-petals");
    if (!container) return;
    container.innerHTML = "";

    const anchors = anchorsForDepth(currentRevealDepth);
    if (!anchors || anchors.length === 0) return;

    const count = 12;
    for (let i = 0; i < count; i++) {
      const anchor = anchors[i % anchors.length];
      const petal = document.createElement("div");
      petal.className = "sakura-petal";

      // Relative coordinates inside the tree container (% based on 900x1000 viewBox)
      const posX = ((anchor.x + ((i * 19) % 30 - 15)) / VIEW_W) * 100;
      const posY = ((anchor.y + ((i * 23) % 24 - 12)) / VIEW_H) * 100;

      // Distance to grass ground (y: 950 in SVG is ~95% of container height)
      const fallDistPercent = Math.max(20, (950 - anchor.y) / VIEW_H * 100);

      const size = 9 + (i % 4); // 9px - 12px
      petal.style.width = `${size}px`;
      petal.style.height = `${size * 0.68}px`;
      petal.style.left = `${posX}%`;
      petal.style.top = `${posY}%`;
      petal.style.setProperty("--fall-dist", `${fallDistPercent}%`);

      const fallDuration = 6.5 + ((i * 3.7) % 4.5); // 6.5s - 11s
      const delay = (i * 1.4) % 11;                 // Staggered loop delay

      petal.style.setProperty("--fall-duration", `${fallDuration}s`);
      petal.style.animationDelay = `${delay}s`;

      container.appendChild(petal);
    }
  }

  // Initial draw: majestic roots and starter branches
  renderTreeStructure(currentRevealDepth);
  initFallingPetals();
  poll(true);

  // CPU & Battery Saver: Pause polling when tab is inactive (Page Visibility API)
  let pollInterval = setInterval(() => poll(false), 15000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    } else {
      poll(false);
      if (!pollInterval) {
        pollInterval = setInterval(() => poll(false), 15000);
      }
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
      formError.textContent = "Dileğin biraz daha uzun olmalı.";
      formError.hidden = false;
      return;
    }
    if (!hcaptchaToken) {
      formError.textContent = "Lütfen doğrulamayı tamamla.";
      formError.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Ağaca asılıyor…";

    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, hcaptchaToken }),
      });
      const payload = await res.json();

      if (!res.ok) {
        formError.textContent = payload.error || "Bir şeyler ters gitti, tekrar dene.";
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
        initFallingPetals();
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
      formError.textContent = "Bağlantı kurulamadı, tekrar dene.";
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
      submitBtn.textContent = "Ağaca As";
    }
  });
})();
