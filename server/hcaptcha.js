const VERIFY_URL = "https://hcaptcha.com/siteverify";

async function verifyHcaptcha(token, remoteIp) {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    throw new Error("HCAPTCHA_SECRET tanımlı değil");
  }
  if (!token) {
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.success === true;
}

module.exports = { verifyHcaptcha };
