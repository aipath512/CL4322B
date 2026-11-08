// TCS INSTAL admin v1.0 (2026-11-08) — protecție /admin cu Cloudflare Access
// Până când CONFIG (sau variabilele de mediu) sunt completate, /admin este BLOCAT pentru toată lumea.
// După configurarea Cloudflare Access, fiecare cerere trebuie să aibă un token Access valid,
// semnat de Cloudflare, pentru exact emailul proprietarului.
const CONFIG = {
  TEAM_DOMAIN: "",   // ex. "tcsinstal.cloudflareaccess.com"
  AUD: "",           // „Application Audience (AUD) Tag” din Cloudflare Access
  OWNER_EMAIL: ""    // emailul proprietarului
};
const page = (title, msg, status) => new Response(
  `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font:17px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#14202b;background:#f6f7f5}@media(prefers-color-scheme:dark){body{color:#e8edf1;background:#10161c}}h1{font-size:1.5rem}</style></head>
<body><h1>${title}</h1><p>${msg}</p><p><a href="/">Înapoi la site</a></p></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
let certCache = null, certTime = 0;
async function verify(token, team, aud) {
  const parts = token.split("."); if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(b64u(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64u(parts[1])));
  if (header.alg !== "RS256") return null;
  if (!certCache || Date.now() - certTime > 3600e3) {
    const r = await fetch(`https://${team}/cdn-cgi/access/certs`); if (!r.ok) return null;
    certCache = (await r.json()).keys || []; certTime = Date.now();
  }
  const jwk = certCache.find(k => k.kid === header.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud) || payload.exp < now || payload.iss !== `https://${team}`) return null;
  return payload;
}
export async function onRequest(context) {
  const { request, env } = context;
  const team = (env.ACCESS_TEAM_DOMAIN || CONFIG.TEAM_DOMAIN).trim();
  const aud = (env.ACCESS_AUD || CONFIG.AUD).trim();
  const owner = (env.OWNER_EMAIL || CONFIG.OWNER_EMAIL).trim().toLowerCase();
  if (!team || !aud || !owner)
    return page("Zonă admin blocată", "Accesul la administrare nu este încă activat. Se activează după configurarea Cloudflare Access pentru proprietar.", 403);
  const cookie = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || (cookie && cookie[1]);
  if (!token) return page("Autentificare necesară", "Intrați prin Cloudflare Access cu emailul proprietarului.", 401);
  let p = null; try { p = await verify(token, team, aud); } catch (e) { p = null; }
  if (!p || String(p.email || "").toLowerCase() !== owner)
    return page("Acces refuzat", "Această zonă este doar pentru proprietarul firmei.", 403);
  const res = await context.next();
  const h = new Headers(res.headers); h.set("Cache-Control", "no-store"); h.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(res.body, { status: res.status, headers: h });
}
