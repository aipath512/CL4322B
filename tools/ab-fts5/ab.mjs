// Test A/B local: motorul IDF al Evei (functions/api/chat.js) vs FTS5/BM25 (SQLite), pe intrebari-test.json.
// Rulare: node tools/ab-fts5/ab.mjs  (scrie rezultatele IDF + liniile, apoi rulează ab.py)
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url)), R = path.resolve(D, '../..');
const { KNOWLEDGE } = await import(pathToFileURL(path.join(R, 'functions/api/_knowledge.js')));
const src = fs.readFileSync(path.join(R, 'functions/api/chat.js'), 'utf8');
new Function('KNOWLEDGE', src.replace(/^import .*$/m, '').replace(/export /g, '') + '\nglobalThis.rank=rank;')(KNOWLEDGE);
const set = JSON.parse(fs.readFileSync(path.join(D, 'intrebari-test.json'), 'utf8'));
fs.writeFileSync(path.join(D, '.idf.json'), JSON.stringify(set.map(([q]) => rank(q, 14))));
fs.writeFileSync(path.join(D, '.lines.json'), JSON.stringify(KNOWLEDGE.split('\n')));
console.log('IDF gata; rulați: python3 tools/ab-fts5/ab.py');
