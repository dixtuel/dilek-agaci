const { quickFilterReject } = require("./wordlist");

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
// Genel amaçlı bir sohbet modeli yerine, NVIDIA'nın bu iş için özel eğittiği
// içerik güvenliği sınıflandırıcısı kullanılıyor (build.nvidia.com katalog sayfası:
// nvidia/llama-3.1-nemotron-safety-guard-8b-v3). 9 dili resmi olarak destekliyor
// (Türkçe bunlardan biri değil), ama talimat + taksonomi + konuşma metnini hedef
// dilde alacak şekilde tasarlanmış, talimat-takipli bir model; taksonomiyi sabit
// tutup dilek metnini olduğu gibi (Türkçe) veriyoruz.
const NIM_MODEL = process.env.NIM_MODEL || "nvidia/llama-3.1-nemotron-safety-guard-8b-v3";
const NIM_TIMEOUT_MS = Number(process.env.NIM_TIMEOUT_MS || 8000);

// Modelin resmi taksonomisi (build.nvidia.com model kartındaki prompt formatı
// birebir korunuyor — modelin bu formatla eğitilmiş olması güvenilirliği artırır).
const TASK_TEMPLATE = (wishText) => `Task: Check if there is unsafe content in the user or agent messages in the below conversation in accordance with our safety policy with the below categories. Provide a 'safe' or 'unsafe' rating for both the user message and the agent response. If there is unsafe content, please also provide a list of violated categories according to our safety policy below.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violence.
S2: Sexual.
S3: Criminal Planning/Confessions.
S4: Guns and Illegal Weapons.
S5: Controlled/Regulated Substances.
S6: Suicide and Self Harm.
S7: Sexual (minor).
S8: Hate/Identity Hate.
S9: PII/Privacy.
S10: Harassment.
S11: Threat.
S12: Profanity.
S13: Needs Caution.
S14: Other.
S15: Manipulation.
S16: Fraud/Deception.
S17: Malware.
S18: High Risk Gov Decision Making.
S19: Political/Misinformation/Conspiracy.
S20: Copyright/Trademark/Plagiarism.
S21: Unauthorized Advice.
S22: Illegal Activity.
S23: Immoral/Unethical.
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>

user: ${wishText}

<END CONVERSATION>

Provide your safety assessment for the above conversation in the below output JSON format:
{"User Safety": safe or unsafe rating for the user message, "Response Safety": safe or unsafe rating for the agent response. Omit if no agent response present. "Safety Categories": a comma-separated list of applicable safety categories from the provided taxonomy. Omit if all safe.}

Do not include anything other than the output JSON in your response.
Output JSON: `;

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
        max_tokens: 100,
        messages: [{ role: "user", content: TASK_TEMPLATE(text) }],
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
    const userSafety = String(parsed["User Safety"] || "").toLowerCase();
    if (userSafety !== "safe" && userSafety !== "unsafe") {
      throw new Error("NIM yanıtı beklenen alanı içermiyor");
    }
    return {
      safe: userSafety === "safe",
      category: parsed["Safety Categories"] || "none",
    };
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
