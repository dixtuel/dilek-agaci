// Cookie-free analytics consent banner.
// Loads Cloudflare Web Analytics (no cookies, no PII/IP storage) only after
// the visitor accepts. The beacon token itself is injected server-side by
// functions/_middleware.js from the CF_WEB_ANALYTICS_TOKEN env var -- this
// file never hardcodes it, so forks/self-hosted copies without that env var
// simply show no banner and load nothing.
//
// Styling reuses each site's own CSS custom properties (--panel-bg,
// --sakura-accent, --card, --sage-btn, ...) so the banner reads as part of
// the site rather than a generic overlay.
(function () {
  "use strict";

  var token = window.__CF_BEACON_TOKEN__;
  if (!token) return; // no env var configured on this deployment -> nothing to consent to

  var STORAGE_KEY = "cf_analytics_consent";
  var isEn = document.documentElement.lang === "en";
  var isKavanoz = /kavanoz/i.test(location.hostname);

  function loadBeacon() {
    if (document.querySelector("script[data-cf-beacon-loaded]")) return;
    var s = document.createElement("script");
    s.defer = true;
    s.type = "module";
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: token }));
    s.setAttribute("data-cf-beacon-loaded", "1");
    document.head.appendChild(s);
  }

  var existing;
  try {
    existing = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    existing = null;
  }

  if (existing === "accepted") {
    loadBeacon();
    return;
  }
  if (existing === "rejected") {
    return;
  }

  function showBanner() {
    var style = document.createElement("style");
    style.textContent = isKavanoz
      ? ".cf-consent-banner{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:328px;" +
        "background:var(--card);border:1px solid var(--line);border-radius:var(--radius-md);" +
        "padding:16px 18px;box-shadow:var(--shadow-md);font-family:var(--font-sans);color:var(--ink);" +
        "opacity:0;transform:translateY(10px);transition:opacity .22s cubic-bezier(.23,1,.32,1),transform .22s cubic-bezier(.23,1,.32,1)}" +
        ".cf-consent-banner.is-visible{opacity:1;transform:translateY(0)}" +
        ".cf-consent-banner p{margin:0 0 12px;font-size:12.5px;line-height:1.45;color:var(--ink-soft)}" +
        ".cf-consent-banner a{color:var(--amber-deep)}" +
        ".cf-consent-actions{display:flex;gap:8px}" +
        ".cf-consent-btn{flex:1;background:#fff;border:1px solid var(--line-strong);color:var(--ink);" +
        "border-radius:999px;padding:8px 12px;font-family:var(--font-sans);font-weight:700;font-size:12px;cursor:pointer;" +
        "transition:transform .15s var(--ease-out,ease),box-shadow .15s var(--ease-out,ease),background .15s ease}" +
        ".cf-consent-btn.is-accept{background:var(--sage-btn);border-color:var(--sage-btn);color:#fff}" +
        "@media (hover:hover) and (pointer:fine){" +
        ".cf-consent-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-sm)}" +
        ".cf-consent-btn.is-accept:hover{background:var(--sage-btn-hover)}}"
      : ".cf-consent-banner{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:328px;" +
        "background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:16px;" +
        "backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);" +
        "padding:16px 18px;box-shadow:var(--card-shadow);font-family:var(--font-body);color:var(--ink);" +
        "opacity:0;transform:translateY(10px);transition:opacity .22s cubic-bezier(.23,1,.32,1),transform .22s cubic-bezier(.23,1,.32,1)}" +
        ".cf-consent-banner.is-visible{opacity:1;transform:translateY(0)}" +
        ".cf-consent-banner p{margin:0 0 12px;font-size:12.5px;line-height:1.45;color:var(--ink-light)}" +
        ".cf-consent-banner a{color:var(--sakura-main)}" +
        ".cf-consent-actions{display:flex;gap:8px}" +
        ".cf-consent-btn{flex:1;background:var(--btn-glass);border:1px solid var(--btn-glass-border);color:var(--ink);" +
        "border-radius:999px;padding:8px 12px;font-family:var(--font-body);font-weight:600;font-size:12px;cursor:pointer;" +
        "transition:transform .15s ease,background .15s ease}" +
        ".cf-consent-btn.is-accept{background:var(--sakura-accent);border-color:var(--sakura-accent);color:#2A2233}" +
        "@media (hover:hover) and (pointer:fine){" +
        ".cf-consent-btn:hover{transform:translateY(-1px);background:var(--btn-glass-hover)}" +
        ".cf-consent-btn.is-accept:hover{background:var(--sakura-main)}}";
    style.textContent +=
      "@media (max-width:400px){.cf-consent-banner{left:10px;right:10px;bottom:10px;max-width:none}}" +
      "@media (prefers-reduced-motion:reduce){.cf-consent-banner{transition:opacity .18s ease;transform:none!important}}";
    document.head.appendChild(style);

    var banner = document.createElement("div");
    banner.className = "cf-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", isEn ? "Cookie and analytics notice" : "Çerez ve analiz bildirimi");

    var text = document.createElement("p");
    text.innerHTML = isEn
      ? 'Cookie-free Cloudflare Web Analytics helps us measure performance (no IP or personal data stored). <a href="/en/privacy.html">Privacy Policy</a>'
      : 'Çerezsiz Cloudflare Web Analytics ile site performansını ölçmek istiyoruz (IP veya kişisel veri saklanmaz). <a href="/privacy.html">Gizlilik Politikası</a>';

    var actions = document.createElement("div");
    actions.className = "cf-consent-actions";

    function dismiss() {
      banner.classList.remove("is-visible");
      setTimeout(function () {
        banner.remove();
      }, 220);
    }

    var rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "cf-consent-btn";
    rejectBtn.textContent = isEn ? "Essential only" : "Sadece gerekli";
    rejectBtn.addEventListener("click", function () {
      try {
        localStorage.setItem(STORAGE_KEY, "rejected");
      } catch (e) {}
      dismiss();
    });

    var acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "cf-consent-btn is-accept";
    acceptBtn.textContent = isEn ? "Accept" : "Kabul et";
    acceptBtn.addEventListener("click", function () {
      try {
        localStorage.setItem(STORAGE_KEY, "accepted");
      } catch (e) {}
      loadBeacon();
      dismiss();
    });

    actions.appendChild(rejectBtn);
    actions.appendChild(acceptBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add("is-visible");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();
