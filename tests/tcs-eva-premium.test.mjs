import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('homepage inline scripts are valid JavaScript',()=>{
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(m=>m[1]).filter(s=>s.trim()&&!s.includes('"@context"'));
 assert.ok(scripts.length>=2);
 for(const s of scripts)assert.doesNotThrow(()=>new vm.Script(s));
});
test('live TCS EVA has dark default independent of the site theme, light toggle, dark green and white',()=>{
 for(const token of ['data-eva-theme="dark"','id="ai-theme"','--chat-bg:#0b141a','--chat-user:#005c4b','--chat-ink:#f5f7fa','--chat-bg:#efeae2','themeKey','localStorage.setItem(themeKey,next)'])
  assert.ok(page.includes(token),token);
});
test('full screen, restore and pointer resizing have touch gestures and persisted size',()=>{
 for(const token of ['id="ai-fullscreen"','id="ai-resize"','touch-action:none','pointerdown','pointermove','pointerup','setFullscreen','setDimensions','saveSize','localStorage.setItem(sizeKey'])
  assert.ok(page.includes(token),token);
});
test('individual answer and whole conversation can be copied or shared explicitly to WhatsApp',()=>{
 for(const token of ['id="ai-copy-all"','id="ai-share-all"','Copiază răspunsul EVA','Distribuie răspunsul EVA','navigator.clipboard.writeText','document.execCommand("copy")','window.open','https://wa.me/?text=','encodeURIComponent(value)','textAll()'])
  assert.ok(page.includes(token),token);
 assert.ok(page.includes('w.setText(j.reply||"Nu este disponibil un răspuns pentru această întrebare.")'));
 assert.ok(!page.includes('w.textContent=j.reply'));
});

test('pilot V1.0 has readable input and disclaimer and targets WhatsApp directly',()=>{
 for(const token of ['--chat-subtle:#dae2e6','--chat-subtle:#334650','#ai-panel #ai-in::placeholder{color:var(--chat-subtle);opacity:1}','font-size:16px','--chat-link:#adf5e0','--chat-link:#075e54','var url="https://wa.me/?text="+encodeURIComponent(value)','if(!opened){window.location.href=url;}'])
  assert.ok(page.includes(token),token);
 assert.ok(!page.includes('navigator.share({text:value}'));
});
test('pilot V1.0 Escape exits fullscreen first and closing restores normal size',()=>{
 assert.ok(page.includes('if(!o&&p.classList.contains("fullscreen"))setFullscreen(false)'));
 assert.ok(page.includes('if(p.classList.contains("fullscreen"))setFullscreen(false);else{open(false);b.focus()}'));
});
