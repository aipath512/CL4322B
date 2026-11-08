// TCS INSTAL admin v1.1 (2026-11-08) — intrare demo în /admin pe baza emailului proprietarului
// Fără cod de verificare (cerință demo): cine introduce emailul corect primește acces pe acest browser 30 de zile.
const OWNER_EMAIL = "contact@5thelement.ai";
const COOKIE = "tcs_admin";
async function token(email) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tcs-instal-admin:" + email.trim().toLowerCase()));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const html = (title, body, status = 200, extra = {}) => new Response(
  `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title>
<style>:root{--bg:#f6f7f5;--fg:#14202b;--mu:#566370;--li:#d8dddc;--ac:#c2541f}@media(prefers-color-scheme:dark){:root{--bg:#10161c;--fg:#e8edf1;--mu:#9eabb6;--li:#2a3640;--ac:#ee8a58}}
body{margin:0;font:17px/1.6 system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg)}main{max-width:420px;margin:14vh auto;padding:0 20px;display:flex;flex-direction:column;gap:14px}
h1{font-size:1.6rem;margin:0}p{margin:0;color:var(--mu)}label{display:flex;flex-direction:column;gap:6px;font-weight:600}
input{font:inherit;padding:12px;border:1px solid var(--li);border-radius:10px;background:transparent;color:var(--fg)}button{font:inherit;font-weight:700;padding:12px;border:0;border-radius:999px;background:var(--ac);color:#fff;cursor:pointer}
.err{color:var(--ac);font-weight:600}a{color:var(--fg)}</style></head><body><main>${body}</main></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...extra } });
const form = (err = "") => html("Intrare admin — TCS INSTAL", `<h1>Admin TCS INSTAL</h1><p>Introduceți emailul proprietarului.</p>
${err ? `<p class="err">${err}</p>` : ""}<form method="post" action="/admin/login"><label for="email">Email<input id="email" name="email" type="email" required autocomplete="email" autofocus></label><br><button type="submit">Intră</button></form><p><a href="/">Înapoi la site</a></p>`, err ? 403 : 200);
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const good = await token(OWNER_EMAIL);
  if (url.pathname === "/admin/login" && request.method === "POST") {
    const f = await request.formData().catch(() => null);
    const email = String((f && f.get("email")) || "");
    if ((await token(email)) !== good) return form("Emailul nu are acces la administrare.");
    return new Response(null, { status: 303, headers: { "Location": "/admin/", "Set-Cookie": `${COOKIE}=${good}; Path=/admin; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`, "Cache-Control": "no-store" } });
  }
  if (url.pathname === "/admin/logout")
    return new Response(null, { status: 303, headers: { "Location": "/", "Set-Cookie": `${COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  const c = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  if (!c || c[1] !== good) return form();
  const res = await context.next();
  const h = new Headers(res.headers); h.set("Cache-Control", "no-store"); h.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(res.body, { status: res.status, headers: h });
}
