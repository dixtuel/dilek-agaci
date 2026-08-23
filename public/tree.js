(() => {
  "use strict";

  const VIEW_W = 800;
  const VIEW_H = 900;
  const MAX_DEPTH = 7;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEED = 20260823;
  const MAX_VISIBLE_BLOSSOMS = 120;

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
   * Builds the tree structure with organic Bézier curves
   */
  function buildTree() {
    const segments = [];

    function branch(x1, y1, angle, length, width, depth) {
      const x2 = x1 + Math.sin(angle) * length;
      const y2 = y1 - Math.cos(angle) * length;

      // Natural curved control points
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const perpX = Math.cos(angle);
      const perpY = Math.sin(angle);
      const bendStrength = length * 0.22 * (rand() - 0.5);

      const offX = midX + perpX * bendStrength;
      const offY = midY + perpY * bendStrength;

      const cx1 = x1 + (offX - x1) * 0.35;
      const cy1 = y1 + (offY - y1) * 0.35;
      const cx2 = offX + (x2 - offX) * 0.35;
      const cy2 = offY + (y2 - offY) * 0.35;

      const isLeaf = depth >= MAX_DEPTH;
      segments.push({ x1, y1, x2, y2, cx1, cy1, cx2, cy2, depth, width, isLeaf });

      if (isLeaf) return;

      const childCount = depth < 2 ? 2 : (rand() > 0.32 ? 2 : 3);
      const spread = 0.42 + rand() * 0.28;

      for (let i = 0; i < childCount; i++) {
        const t = childCount === 1 ? 0 : i / (childCount - 1) - 0.5;
        const childAngle = angle + t * spread * 2 + (rand() - 0.5) * 0.16;
        const childLength = length * (0.72 + rand() * 0.1);
        const childWidth = width * 0.66;
        branch(x2, y2, childAngle, childLength, childWidth, depth + 1);
      }
    }

    // Trunk starts from bottom center
    branch(VIEW_W / 2, VIEW_H - 30, 0, 138, 18, 0);
    return segments;
  }

  const SEGMENTS = buildTree();

  function revealDepthForTotal(total) {
    if (total <= 0) return 3;
    if (total < 10) return 4;
    if (total < 30) return 5;
    if (total < 70) return 6;
    return MAX_DEPTH;
  }

  function anchorsForDepth(revealDepth) {
    return SEGMENTS.filter((s) => s.depth <= revealDepth && (s.depth === revealDepth || s.isLeaf)).map(
      (s) => ({ x: s.x2, y: s.y2 })
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

  // --- SVG Tree Setup ---
  const svg = document.getElementById("tree-svg");
  const branchLayer = document.createElementNS(SVG_NS, "g");
  const blossomLayer = document.createElementNS(SVG_NS, "g");
  svg.appendChild(branchLayer);
  svg.appendChild(blossomLayer);

  const skyWishes = document.getElementById("sky-wishes");

  let currentRevealDepth = 3;
  let allWishes = [];
  let lastId = 0;

  const renderedBlossoms = new Map();
  const renderedStars = new Map();

  /**
   * Render branches up to current depth
   */
  function renderBranches(revealDepth) {
    branchLayer.innerHTML = "";
    SEGMENTS.filter((s) => s.depth <= revealDepth).forEach((s) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${s.x1},${s.y1} C ${s.cx1},${s.cy1} ${s.cx2},${s.cy2} ${s.x2},${s.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", Math.max(1.8, s.width));
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      branchLayer.appendChild(path);
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
    g.setAttribute("filter", "url(#petal-shadow)");

    // Large visible scale (24px - 32px diameter)
    const scale = 1.5 + (hashId(wish.id) % 30) / 100;
    const petalColor = HUE_COLORS[hue] || "#ff5c8d";

    // Invisible generous hitbox for easy mobile tapping (40px)
    const hitbox = document.createElementNS(SVG_NS, "circle");
    hitbox.setAttribute("r", 20);
    hitbox.setAttribute("fill", "transparent");
    g.appendChild(hitbox);

    // 5 Sakura petals
    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS(SVG_NS, "ellipse");
      petal.setAttribute("class", "petal");
      petal.setAttribute("cx", "0");
      petal.setAttribute("cy", -6.2 * scale);
      petal.setAttribute("rx", 3.8 * scale);
      petal.setAttribute("ry", 6.8 * scale);
      petal.setAttribute("fill", petalColor);
      petal.setAttribute("opacity", "0.95");
      petal.setAttribute("transform", `rotate(${i * 72})`);
      g.appendChild(petal);
    }

    // Golden center pistil
    const center = document.createElementNS(SVG_NS, "circle");
    center.setAttribute("r", 2.8 * scale);
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
    const top = (hashId(wish.id + 7) % 40 + 8);

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

          // Natural organic offset
          const offsetX = (hashId(wish.id + 11) % 25) - 12;
          const offsetY = (hashId(wish.id + 17) % 25) - 12;

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
      counter.textContent = "ağaç henüz sessiz, ilk dileği sen bırak";
    } else if (starCount <= 0) {
      counter.textContent = `🌸 bu ağaçta ${total} dilek çiçek açtı`;
    } else {
      counter.textContent = `🌸 ${treeCount} çiçek • ✨ ${starCount} yıldız`;
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
        // Prevent duplicates
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
          renderBranches(currentRevealDepth);
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

  // Initial draw
  renderBranches(currentRevealDepth);
  poll(true);
  setInterval(() => poll(false), 15000);

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

      // Add new wish to list and immediately render
      allWishes.push(payload.wish);
      lastId = Math.max(lastId, payload.wish.id);

      const total = payload.total;
      const nextRevealDepth = revealDepthForTotal(total);
      if (nextRevealDepth !== currentRevealDepth) {
        currentRevealDepth = nextRevealDepth;
        renderBranches(currentRevealDepth);
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
