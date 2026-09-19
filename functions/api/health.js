/**
 * Cloudflare Pages Functions - /api/health
 * Fast, zero-dependency health check probe matching Node.js/Express /api/health.
 */
export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, runtime: "cloudflare-pages" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
