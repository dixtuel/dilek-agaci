(() => {
  "use strict";

  const VIEW_W = 800;
  const VIEW_H = 900;
  const MAX_DEPTH = 7;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEED = 20260823;
  const HUES = ["sakura", "rose", "cream", "amber"];
  const HUE_COLORS = { sakura: "#ffb7c5", rose: "#ff85a1", cream: "#f7e8d0", amber: "#f6c90e" };
  const MAX_VISIBLE_BLOSSOMS = 80;

  /**
   * Mulberry32 PRNG function
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

      // Bézier control points for natural curves
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      const perpX = Math.cos(angle);
      const perpY = Math.sin(angle);
      const bendStrength = length * 0.2 * (rand() - 0.5);
      
      const offX = midX + perpX * bendStrength;
      const offY = midY + perpY * bendStrength;

      // Interpolated 1/3 and 2/3 of the way
      const cx1 = x1 + (offX - x1) * 0.33;
      const cy1 = y1 + (offY - y1) * 0.33;
      const cx2 = offX + (x2 - offX) * 0.33;
      const cy2 = offY + (y2 - offY) * 0.33;

      const isLeaf = depth >= MAX_DEPTH;
      segments.push({ x1, y1, x2, y2, cx1, cy1, cx2, cy2, depth, width, isLeaf });

      if (isLeaf) return;

      const childCount = depth < 2 ? 2 : (rand() > 0.3 ? 2 : 3);
      const spread = 0.4 + rand() * 0.3;
      
      for (let i = 0; i < childCount; i++) {
        const t = childCount === 1 ? 0 : i / (childCount - 1) - 0.5;
        const childAngle = angle + t * spread * 2 + (rand() - 0.5) * 0.18;
        const childLength = length * (0.7 + rand() * 0.12);
        const childWidth = width * 0.65;
        branch(x2, y2, childAngle, childLength, childWidth, depth + 1);
      }
    }

    branch(VIEW_W / 2, VIEW_H - 20, 0, 130, 16, 0);
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

  // DOM Elements setup
  const svg = document.getElementById("tree-svg");
  const branchLayer = document.createElementNS(SVG_NS, "g");
  const blossomLayer = document.createElementNS(SVG_NS, "g");
  svg.appendChild(branchLayer);
  svg.appendChild(blossomLayer);

  const skyWishes = document.getElementById("sky-wishes");
  const tooltipEl = document.getElementById("wish-tooltip");

  let currentRevealDepth = 3;
  let allWishes = [];
  let lastId = 0;

  // Track currently rendered items to avoid unnecessary re-renders
  const renderedBlossoms = new Map();
  const renderedStars = new Map();

  /**
   * Render branches up to the current reveal depth
   */
  function renderBranches(revealDepth) {
    branchLayer.innerHTML = "";
    SEGMENTS.filter((s) => s.depth <= revealDepth).forEach((s) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${s.x1},${s.y1} C ${s.cx1},${s.cy1} ${s.cx2},${s.cy2} ${s.x2},${s.y2}`);
      path.setAttribute("stroke", "url(#bark-grad)");
      path.setAttribute("stroke-width", Math.max(1.5, s.width));
      path.setAttribute("class", "branch");
      path.setAttribute("fill", "none");
      branchLayer.appendChild(path);
    });
  }

  /**
   * Helper to format relative time for tooltip
   */
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

  const tooltip = {
    show(node, wish) {
      const isHtml = node instanceof HTMLElement;
      const rect = node.getBoundingClientRect();
      tooltipEl.innerHTML = "";
      
      const text = document.createElement("span");
      text.textContent = wish.text;
      tooltipEl.appendChild(text);
      
      if (wish.name) {
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = `— ${wish.name}`;
        tooltipEl.appendChild(who);
      }
      
      if (wish.created_at) {
        const when = document.createElement("span");
        when.className = "when";
        when.textContent = timeAgo(wish.created_at);
        tooltipEl.appendChild(when);
      }
      
      tooltipEl.hidden = false;
      const top = rect.top - tooltipEl.offsetHeight - 12 + window.scrollY;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2, 8),
        window.innerWidth - tooltipEl.offsetWidth - 8
      );
      tooltipEl.style.top = `${Math.max(top, 8)}px`;
      tooltipEl.style.left = `${left}px`;
    },
    hide() {
      tooltipEl.hidden = true;
    },
    toggle(node, wish) {
      if (tooltipEl.hidden) {
        this.show(node, wish);
      } else {
        this.hide();
      }
    }
  };

  /**
   * Makes a blossom SVG group
   */
  function makeBlossom(x, y, hue, wish) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "blossom");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    const label = wish
      ? `${wish.name ? wish.name + ": " : "bir dilek: "}${wish.text}`
      : "bir dilek";
    g.setAttribute("aria-label", label);

    const scale = 0.8 + (hashId(wish.id) % 35) / 100;
    const petalColor = HUE_COLORS[hue];

    g.setAttribute("filter", "url(#blossom-glow)");

    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS(SVG_NS, "ellipse");
      petal.setAttribute("class", "petal");
      petal.setAttribute("cx", "0");
      petal.setAttribute("cy", -5.5 * scale);
      petal.setAttribute("rx", 3.2 * scale);
      petal.setAttribute("ry", 5.8 * scale);
      petal.setAttribute("fill", petalColor);
      petal.setAttribute("opacity", "0.92");
      petal.setAttribute("transform", `rotate(${i * 72})`);
      g.appendChild(petal);
    }
    
    const center = document.createElementNS(SVG_NS, "circle");
    center.setAttribute("r", 2.2 * scale);
    center.setAttribute("fill", "#fff4da");
    g.appendChild(center);

    const showTip = () => tooltip.show(g, wish);
    const toggleTip = (e) => { e.preventDefault(); tooltip.toggle(g, wish); };
    
    g.addEventListener("mouseenter", showTip);
    g.addEventListener("focus", showTip);
    g.addEventListener("mouseleave", tooltip.hide);
    g.addEventListener("blur", tooltip.hide);
    g.addEventListener("click", toggleTip);
    g.addEventListener("touchstart", toggleTip, { passive: false });

    return g;
  }

  /**
   * Creates a star element for the sky
   */
  function placeStar(wish) {
    const star = document.createElement("button");
    star.className = "sky-star";
    
    const left = (hashId(wish.id) % 90 + 5);
    const top = (hashId(wish.id + 7) % 45 + 5);
    
    star.style.left = `${left}%`;
    star.style.top = `${top}%`;
    
    const size = 8 + (hashId(wish.id + 13) % 7);
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    
    const delay = (hashId(wish.id + 21) % 5000) / 1000;
    star.style.animationDelay = `${delay}s`;
    
    const label = `${wish.name ? wish.name + ": " : "bir dilek: "}${wish.text}`;
    star.setAttribute("aria-label", label);
    
    const showTip = () => tooltip.show(star, wish);
    const toggleTip = (e) => { e.preventDefault(); tooltip.toggle(star, wish); };
    
    star.addEventListener("mouseenter", showTip);
    star.addEventListener("focus", showTip);
    star.addEventListener("mouseleave", tooltip.hide);
    star.addEventListener("blur", tooltip.hide);
    star.addEventListener("click", toggleTip);
    star.addEventListener("touchstart", toggleTip, { passive: false });
    
    return star;
  }

  /**
   * Main lifecycle rendering engine
   * Splits wishes into tree vs sky and handles transitions
   */
  function renderTreeAndStars(wishes, animateNew) {
    const starCount = Math.max(0, wishes.length - MAX_VISIBLE_BLOSSOMS);
    const starWishes = wishes.slice(0, starCount);
    const treeWishes = wishes.slice(starCount);
    
    const anchors = anchorsForDepth(currentRevealDepth);
    
    // 1. Ascend old blossoms to stars
    for (const [id, blossom] of renderedBlossoms.entries()) {
      if (!treeWishes.find(w => w.id === id)) {
        if (animateNew) {
          blossom.classList.add("ascending");
          blossom.addEventListener("animationend", () => blossom.remove());
        } else {
          blossom.remove();
        }
        renderedBlossoms.delete(id);
      }
    }
    
    // 2. Place stars in sky
    starWishes.forEach(wish => {
      if (!renderedStars.has(wish.id)) {
        const star = placeStar(wish);
        skyWishes.appendChild(star);
        renderedStars.set(wish.id, star);
      }
    });
    
    // 3. Place new blossoms on tree
    if (anchors.length > 0) {
      treeWishes.forEach(wish => {
        if (!renderedBlossoms.has(wish.id)) {
          const anchorIdx = hashId(wish.id) % anchors.length;
          const anchor = anchors[anchorIdx];
          
          // Random offset to prevent exact overlap
          const offsetX = (hashId(wish.id + 11) % 17) - 8;
          const offsetY = (hashId(wish.id + 17) % 17) - 8;
          
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

  /**
   * Updates the bottom counter
   */
  function updateCounter(treeCount, starCount, total) {
    const counter = document.getElementById("counter");
    if (total <= 0) {
      counter.textContent = "ağaç henüz sessiz, ilk dileği sen bırak";
    } else if (starCount <= 0) {
      counter.textContent = `🌸 bu ağaçta ${total} dilek çiçek açtı`;
    } else {
      counter.textContent = `🌸 ${treeCount} çiçek • ✨ ${starCount} yıldız`;
    }
  }

  /**
   * Initializes fireflies
   */
  function createFireflies() {
    const container = document.getElementById("fireflies");
    if (!container) return;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "firefly";
      el.style.left = (10 + Math.random() * 80) + "%";
      el.style.top = (35 + Math.random() * 55) + "%";
      el.style.animationDelay = (Math.random() * 8) + "s";
      el.style.animationDuration = (15 + Math.random() * 12) + "s, " + (4 + Math.random() * 4) + "s";
      container.appendChild(el);
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
      
      let newWishesFetched = false;
      
      if (initial) {
        allWishes = wishes;
        newWishesFetched = true;
      } else if (wishes.length > 0) {
        allWishes = [...allWishes, ...wishes];
        newWishesFetched = true;
      }
      
      if (newWishesFetched) {
        const nextRevealDepth = revealDepthForTotal(total);
        if (nextRevealDepth !== currentRevealDepth) {
          currentRevealDepth = nextRevealDepth;
          renderBranches(currentRevealDepth);
          // If tree shape changed significantly, clear blossoms and redraw immediately
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
        // Just update counter if total shifted without new items returned
        updateCounter(Math.min(total, MAX_VISIBLE_BLOSSOMS), Math.max(0, total - MAX_VISIBLE_BLOSSOMS), total);
      }
    } catch (err) {
      console.warn("Dilek Ağacı: senkronizasyon hatası", err);
    }
  }

  // --- Initial Setup ---
  createFireflies();
  renderBranches(currentRevealDepth);
  poll(true);
  setInterval(() => poll(false), 15000);

  // --- Panel / form Handling ---
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
    textArea.focus();
  }
  
  function closePanel() {
    panel.hidden = true;
    backdrop.hidden = true;
  }

  openBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  textArea.addEventListener("input", () => {
    charCount.textContent = String(textArea.value.length);
  });
  
  // Mobile tap outside tooltip support
  document.addEventListener("click", (e) => {
    if (!tooltipEl.hidden && !e.target.closest('.blossom') && !e.target.closest('.sky-star') && !e.target.closest('#wish-tooltip')) {
      tooltip.hide();
    }
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
    submitBtn.textContent = "gönderiliyor…";

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

      // Add to our local state and re-render
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
      submitBtn.textContent = "Ağaca bırak";
    }
  });

})();
