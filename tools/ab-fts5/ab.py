#!/usr/bin/env python3
# Test A/B: același index FTS5 ca în D1 (unicode61 remove_diacritics 2, prefix 3/4/5, bm25(k,3,1)) vs IDF.
import json, sqlite3, re, unicodedata, os
D = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(D, ".lines.json"))); S = json.load(open(os.path.join(D, "intrebari-test.json"))); I = json.load(open(os.path.join(D, ".idf.json")))
db = sqlite3.connect(":memory:")
db.execute('create virtual table k using fts5(q, body, tokenize="unicode61 remove_diacritics 2", prefix="3 4 5")')
for l in lines:
    m = re.search(r"Întrebare: (.*?) Răspuns:", l); db.execute("insert into k(q,body) values(?,?)", (m.group(1) if m else "", l))
STOP = set("pot vreau cat costa ce este sunt pentru care cum unde la de si sau un o in cu pe din mai ce-i va vă imi ati aveti oferiti face faceti".split())
norm = lambda s: "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
stem = lambda w: w[:4] if len(w) <= 6 else w[:5]
def fts(q, n=14):
    t = [w for w in re.split(r"[^a-z0-9]+", norm(q)) if len(w) > 2 and w not in STOP]
    if not t: return []
    expr = " OR ".join(f'"{stem(w)}"*' if len(w) >= 5 else f'"{w}"*' for w in t)
    return [r[0] for r in db.execute("select body from k where k match ? order by bm25(k,3.0,1.0) limit ?", (expr, n))]
hit = lambda res, exp, k: any(norm(exp) in norm(x) for x in res[:k])
tot = {"idf": [0, 0, 0], "fts5": [0, 0, 0]}
for (q, exp), ri in zip(S, I):
    rf = fts(q)
    for name, r in (("idf", ri), ("fts5", rf)):
        for j, k in enumerate((1, 5, 14)): tot[name][j] += hit(r, exp, k)
    if hit(ri, exp, 1) != hit(rf, exp, 1): print("diferență @1:", q, "->", "IDF" if hit(ri, exp, 1) else "FTS5")
n = len(S)
for name, v in tot.items(): print(f"{name}: primul loc {v[0]}/{n} · primele 5 {v[1]}/{n} · primele 14 {v[2]}/{n}")
