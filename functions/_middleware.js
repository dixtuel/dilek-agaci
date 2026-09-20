export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === "dilekagaci.dxtl.com.tr") {
    url.hostname = "dilekagaci.sely.tr";
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();

  // Cloudflare Web Analytics: token comes from the CF_WEB_ANALYTICS_TOKEN env
  // var (Pages project settings), never hardcoded in the repo. Forks/self-hosts
  // without that var set get no injection at all -- consent-banner.js also
  // no-ops in that case.
  const token = context.env.CF_WEB_ANALYTICS_TOKEN;
  const contentType = response.headers.get("content-type") || "";
  if (!token || !contentType.includes("text/html")) {
    return response;
  }

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append(
          `<script>window.__CF_BEACON_TOKEN__=${JSON.stringify(token)};</script>` +
            `<script defer src="/consent-banner.js"></script>`,
          { html: true }
        );
      },
    })
    .transform(response);
}
