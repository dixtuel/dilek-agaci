const { quickFilterReject } = require("./wordlist");

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL = process.env.NIM_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const NIM_TIMEOUT_MS = Number(process.env.NIM_TIMEOUT_MS || 8000);

const SYSTEM_PROMPT = `Sen bir içerik güvenliği sınıflandırıcısısın. Sana bir "Dilek Ağacı" sitesine
gönderilmiş Türkçe bir dilek metni verilecek. Görevin bu metnin herkese açık, aile dostu bir
sitede yayınlanmaya uygun olup olmadığını değerlendirmek.

Şu kategorilerden herhangi biri varsa metni GÜVENSİZ say: nefret söylemi/ayrımcılık, cinsel içerik,
şiddet veya tehdit, taciz/zorbalık, kendine zarar verme veya intihar teşviki, yasa dışı faaliyet,
reklam/spam, kişisel veri ifşası (telefon, adres, TC kimlik no vb.).

Sadece şu JSON formatında yanıt ver, başka hiçbir metin ekleme:
{"safe": true veya false, "category": "kısa kategori adı veya none"}`;

function buildTimeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function classifyWithNim(text) {
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NIM_API_KEY tanımlı değil");
  }

  const { signal, cancel } = buildTimeoutSignal(NIM_TIMEOUT_MS);
  try {
    const response = await fetch(NIM_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`NIM API ${response.status}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("NIM yanıtı JSON içermiyor");
    }
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.safe !== "boolean") {
      throw new Error("NIM yanıtı beklenen alanı içermiyor");
    }
    return parsed;
  } finally {
    cancel();
  }
}

/**
 * İki katmanlı moderasyon: önce ücretsiz yerel filtre, sonra NIM tabanlı sınıflandırma.
 * NIM erişilemezse fail-closed davranır (dilek reddedilir) — düşük trafikli bir site
 * için içerik riskini erişilebilirliğe tercih etmek daha güvenli.
 */
async function moderateWish(text) {
  if (quickFilterReject(text)) {
    return { safe: false, category: "yerel-filtre" };
  }

  try {
    const result = await classifyWithNim(text);
    return result;
  } catch (err) {
    return { safe: false, category: "moderasyon-hatasi", error: err.message };
  }
}

module.exports = { moderateWish };
