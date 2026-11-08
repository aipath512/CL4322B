#!/usr/bin/env python3
# TCS INSTAL — monitorizare zilnică concurenți (prețuri publicate, promoții, disponibilitate pagină).
# Rulează din GitHub Actions (.github/workflows/monitorizare-concurenti.yml). Citește doar pagini publice,
# o cerere pe pagină pe zi. Scrie public/admin/monitorizare.json (protejat de login-ul admin) și data/monitorizare-stare.json.
import json, re, html, hashlib, os, urllib.request, datetime, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TINTE = json.load(open(os.path.join(ROOT, "tools", "monitorizare_tinte.json")))
STARE = os.path.join(ROOT, "data", "monitorizare-stare.json")
OUT = os.path.join(ROOT, "public", "admin", "monitorizare.json")
UA = "TCS-INSTAL-monitor/1.0 (site etalon demonstrativ; o citire pe zi)"
PRET = re.compile(r"\d[\d.\s]{0,8}(?:,\d{1,2})?\s*(?:-|–)?\s*(?:\d[\d.\s]{0,8})?\s*(?:lei|ron)\b", re.I)
PROMO = re.compile(r"(reducere|promo[tț]i|ofert[aă] special|discount|black friday|gratuit|\-\s?\d{1,2}\s?%|\d{1,2}\s?%\s*(?:reducere|discount))", re.I)

def text_din(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<(br|/p|/li|/tr|/h[1-6]|/div|/td|/th)[^>]*>", "\n", h)
    h = re.sub(r"<[^>]+>", " ", h)
    h = html.unescape(h)
    lines = [re.sub(r"\s+", " ", l).strip() for l in h.split("\n")]
    return [l for l in lines if l]

def citeste(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ro-RO,ro;q=0.9"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.status, r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")

def uniq(xs, n):
    out = []
    for x in xs:
        if x not in out: out.append(x)
        if len(out) >= n: break
    return out

def main():
    acum = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    zi = acum.isoformat().replace("+00:00", "Z")
    stare = json.load(open(STARE)) if os.path.exists(STARE) else {"firme": {}, "evenimente": [], "rulari": []}
    rez = []
    for t in TINTE:
        f, url = t["firma"], t["url"]
        prev = stare["firme"].get(f, {})
        r = dict(firma=f, url=url, verificat=zi)
        try:
            st, h = citeste(url)
            lines = text_din(h)
            ctx = [(lines[i-1] + " — " + l) if (len(l) < 30 and i > 0 and not PRET.search(lines[i-1])) else l for i, l in enumerate(lines)]
            preturi = uniq([l[:200] for l in ctx if PRET.search(l) and len(l) < 280], 40)
            promo = uniq([l[:180] for l in lines if PROMO.search(l) and len(l) < 260], 15)
            r.update(status=st, ok=True, preturi=preturi, promotii=promo,
                     hash_preturi=hashlib.sha256("\n".join(preturi).encode()).hexdigest()[:16],
                     hash_pagina=hashlib.sha256("\n".join(lines).encode()).hexdigest()[:16])
            if prev.get("ok") and prev.get("hash_preturi") != r["hash_preturi"]:
                plus = [x for x in preturi if x not in prev.get("preturi", [])][:10]
                minus = [x for x in prev.get("preturi", []) if x not in preturi][:10]
                stare["evenimente"].append(dict(data=zi, firma=f, tip="Prețuri modificate", aparute=plus, disparute=minus))
            noi = [x for x in promo if x not in prev.get("promotii", [])]
            if prev.get("ok") and noi:
                stare["evenimente"].append(dict(data=zi, firma=f, tip="Promoție nouă", aparute=noi[:10], disparute=[]))
            if prev and not prev.get("ok"):
                stare["evenimente"].append(dict(data=zi, firma=f, tip="Pagina a revenit online", aparute=[], disparute=[]))
            r["ultima_schimbare"] = zi if (not prev or prev.get("hash_preturi") != r["hash_preturi"]) else prev.get("ultima_schimbare", zi)
        except Exception as e:
            msg = str(e)
            if "403" in msg: msg = "Site-ul refuză citirea automată (403). Se verifică manual."
            elif "404" in msg: msg = "Pagina nu mai există la această adresă (404)."
            elif "timed out" in msg.lower(): msg = "Pagina nu a răspuns în 40 de secunde."
            e = msg
            r.update(ok=False, eroare=str(e)[:160], preturi=prev.get("preturi", []), promotii=prev.get("promotii", []),
                     hash_preturi=prev.get("hash_preturi"), ultima_schimbare=prev.get("ultima_schimbare"))
            if prev.get("ok", True):
                stare["evenimente"].append(dict(data=zi, firma=f, tip="Pagina nu răspunde", aparute=[str(e)[:120]], disparute=[]))
        stare["firme"][f] = r; rez.append(r)
        time.sleep(3)
    stare["evenimente"] = stare["evenimente"][-300:]
    stare["rulari"] = (stare["rulari"] + [dict(data=zi, ok=sum(1 for x in rez if x["ok"]), total=len(rez))])[-400:]
    os.makedirs(os.path.dirname(STARE), exist_ok=True); os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(stare, open(STARE, "w"), ensure_ascii=False, indent=1)
    json.dump(dict(generat=zi, frecventa="zilnic, automat (GitHub Actions)", firme=rez,
                   evenimente=list(reversed(stare["evenimente"][-100:])), rulari=stare["rulari"][-60:]),
              open(OUT, "w"), ensure_ascii=False, indent=1)
    print(zi, "ok", sum(1 for x in rez if x["ok"]), "/", len(rez))

if __name__ == "__main__":
    main()
