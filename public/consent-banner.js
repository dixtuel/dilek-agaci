// Cookie-free analytics consent banner.
// Loads Cloudflare Web Analytics (no cookies, no PII/IP storage) only after
// the visitor accepts. The beacon token itself is injected server-side by
// functions/_middleware.js from the CF_WEB_ANALYTICS_TOKEN env var — this
// file never hardcodes it, so forks/self-hosted copies without that env var
// simply show no banner and load nothing.
(function () {
  "use strict";

  var token = window.__CF_BEACON_TOKEN__;
  if (!token) return; // no env var configured on this deployment -> nothing to consent to

  var STORAGE_KEY = "cf_analytics_consent";
  var isEn = document.documentElement.lang === "en";

  function loadBeacon() {
    if (document.querySelector('script[data-cf-beacon-loaded]')) return;
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
    style.textContent =
      ".cf-consent-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;" +
      "background:#1b1a1b;color:#f6f0e3;border:1px solid rgba(246,240,227,.18);border-radius:10px;" +
      "padding:14px 16px;font:13px/1.45 system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center;flex-wrap:wrap}" +
      ".cf-consent-banner p{margin:0;flex:1 1 240px}" +
      ".cf-consent-banner a{color:#f6f0e3;text-decoration:underline}" +
      ".cf-consent-actions{display:flex;gap:8px;flex:0 0 auto}" +
      ".cf-consent-btn{border:1px solid rgba(246,240,227,.4);background:transparent;color:#f6f0e3;" +
      "padding:8px 14px;border-radius:7px;font:600 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}" +
      ".cf-consent-btn.is-accept{background:#f6f0e3;color:#1b1a1b;border-color:#f6f0e3}" +
      "@media (max-width:480px){.cf-consent-banner{flex-direction:column;align-items:stretch}" +
      ".cf-consent-actions{justify-content:stretch}.cf-consent-btn{flex:1 1 0}}";
    document.head.appendChild(style);

    var banner = document.createElement("div");
    banner.className = "cf-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", isEn ? "Cookie and analytics notice" : "Çerez ve analiz bildirimi");

    var text = document.createElement("p");
    text.innerHTML = isEn
      ? 'We\'d like to use cookie-free Cloudflare Web Analytics to measure site performance (no cookies, no IP or personal data stored). Read our <a href="/en/privacy.html">Privacy Policy</a>.'
      : 'Site performansını ölçmek için çerezsiz Cloudflare Web Analytics kullanmak istiyoruz (çerez yok, IP veya kişisel veri saklanmıyor). <a href="/privacy.html">Gizlilik Politikası\'nı</a> okuyabilirsiniz.';

    var actions = document.createElement("div");
    actions.className = "cf-consent-actions";

    var rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "cf-consent-btn";
    rejectBtn.textContent = isEn ? "Essential only" : "Sadece gerekli";
    rejectBtn.addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "rejected"); } catch (e) {}
      banner.remove();
    });

    var acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "cf-consent-btn is-accept";
    acceptBtn.textContent = isEn ? "Accept" : "Kabul et";
    acceptBtn.addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch (e) {}
      loadBeacon();
      banner.remove();
    });

    actions.appendChild(rejectBtn);
    actions.appendChild(acceptBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();
