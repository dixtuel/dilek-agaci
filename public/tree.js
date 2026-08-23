(() => {
  "use strict";

  const VIEW_W = 800;
  const VIEW_H = 900;
  const MAX_DEPTH = 7;
  const SEED = 20260823;
  const HUES = ["rose", "saffron", "periwinkle"];
  const HUE_COLORS = { rose: "#e8785a", saffron: "#f0b429", periwinkle: "#8c8fe0" };

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

  function buildTree() {
    const rand = mulberry32(SEED);
    const segments = [];

    function branch(x, y, angle, length, width, depth) {
      const x2 = x + Math.sin(angle) * length;
      const y2 = y - Math.cos(angle) * length;
      const seg = { x1: x, y1: y, x2, y2, depth, width, isLeaf: depth === MAX_DEPTH };
      segments.push(seg);

      if (depth === MAX_DEPTH) return;

      const childCount = depth < 3 ? 2 : rand() > 0.35 ? 2 : 3;
      const spread = 0.42 + rand() * 0.25;
      for (let i = 0; i < childCount; i++) {
        const t = childCount === 1 ? 0 : i / (childCount - 1) - 0.5;
        const childAngle = angle + t * spread * 2 + (rand() - 0.5) * 0.18;
        const childLength = length * (0.72 + rand() * 0.1);
        const childWidth = width * 0.68;
        branch(x2, y2, childAngle, childLength, childWidth, depth + 1);
      }
    }

    branch(VIEW_W / 2, VIEW_H - 20, 0, 132, 15, 0);
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

  const svg = document.getElementById("tree-svg");
  const branchLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const blossomLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(branchLayer);
  svg.appendChild(blossomLayer);

  let currentRevealDepth = 3;

  function renderBranches(revealDepth) {
    branchLayer.innerHTML = "";
    SEGMENTS.filter((s) => s.depth <= revealDepth).forEach((s) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", s.x1);
      line.setAttribute("y1", s.y1);
      line.setAttribute("x2", s.x2);
      line.setAttribute("y2", s.y2);
      line.setAttribute("stroke-width", Math.max(1.4, s.width));
      line.setAttribute("class", "branch");
      branchLayer.appendChild(line);
    });
  }

  function makeBlossom(x, y, hue, wish) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "blossom");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    const label = wish
      ? `${wish.name ? wish.name + ": " : "bir dilek: "}${wish.text}`
      : "bir dilek";
    g.setAttribute("aria-label", label);

    const scale = 0.85 + (hashId(wish ? wish.id : x + y) % 30) / 100;
    const petalColor = HUE_COLORS[hue];

    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      petal.setAttribute("class", "petal");
      petal.setAttribute("cx", "0");
      petal.setAttribute("cy", -5.5 * scale);
      petal.setAttribute("rx", 3.4 * scale);
      petal.setAttribute("ry", 5.6 * scale);
      petal.setAttribute("fill", petalColor);
      petal.setAttribute("opacity", "0.92");
      petal.setAttribute("transform", `rotate(${i * 72})`);
      g.appendChild(petal);
    }
    const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    center.setAttribute("r", 2.4 * scale);
    center.setAttribute("fill", "#fff4da");
    g.appendChild(center);

    if (wish) {
      const showTip = () => tooltip.show(g, wish);
      g.addEventListener("mouseenter", showTip);
      g.addEventListener("focus", showTip);
      g.addEventListener("mouseleave", tooltip.hide);
      g.addEventListener("blur", tooltip.hide);
    }

    return g;
  }

  const tooltipEl = document.getElementById("wish-tooltip");
  const tooltip = {
    show(node, wish) {
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
  };

  let lastId = 0;
  let renderedAnchorCursor = 0;

  function placeWish(wish, animate) {
    const anchors = anchorsForDepth(currentRevealDepth);
    if (!anchors.length) return;
    const anchor = anchors[hashId(wish.id) % anchors.length];
    const hue = HUES[hashId(wish.id + 1) % HUES.length];
    const blossom = makeBlossom(anchor.x, anchor.y, hue, wish);
    if (!animate) blossom.style.animation = "none";
    blossomLayer.appendChild(blossom);
  }

  function updateCounter(total) {
    const counter = document.getElementById("counter");
    if (total <= 0) {
      counter.textContent = "ağaç henüz sessiz, ilk dileği sen bırak";
    } else if (total === 1) {
      counter.textContent = "bu ağaçta 1 dilek açtı";
    } else {
      counter.textContent = `bu ağaçta ${total} dilek açtı`;
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
      const nextRevealDepth = revealDepthForTotal(total);
      if (nextRevealDepth !== currentRevealDepth) {
        currentRevealDepth = nextRevealDepth;
        renderBranches(currentRevealDepth);
        blossomLayer.innerHTML = "";
        const { wishes: all } = await fetchWishes(0);
        all.forEach((w) => placeWish(w, false));
        lastId = all.length ? all[all.length - 1].id : 0;
      } else {
        wishes.forEach((w) => placeWish(w, true));
        if (wishes.length) lastId = wishes[wishes.length - 1].id;
      }
      updateCounter(total);
    } catch (err) {
      // sessizce yeniden dene — ağ hatası kullanıcıyı bloklamamalı
      console.warn("Dilek Ağacı: senkronizasyon hatası", err);
    }
  }

  renderBranches(currentRevealDepth);
  poll(true);
  setInterval(() => poll(false), 15000);

  // --- Panel / form ---
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

      placeWish(payload.wish, true);
      lastId = Math.max(lastId, payload.wish.id);
      updateCounter(payload.total);

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
          /* widget henüz yüklenmemiş olabilir */
        }
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Ağaca bırak";
    }
  });
})();
