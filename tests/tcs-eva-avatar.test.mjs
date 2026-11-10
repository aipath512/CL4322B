import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('EVA floating button and chat header use supplied animation',()=>{
 assert.equal((html.match(/src="img\/eva-asistent_v2\.0\.mp4"/g)||[]).length,2);
 assert.equal((html.match(/src="img\/eva-asistent_v1\.0\.mp4"/g)||[]).length,0);
 assert.equal((html.match(/autoplay muted loop playsinline preload="metadata"/g)||[]).length,2);
});
test('optimized animated asset exists, nonempty and is a valid MP4 container',()=>{
 const path=new URL('../public/img/eva-asistent_v2.0.mp4',import.meta.url);
 const raw=readFileSync(path);assert.ok(statSync(path).size>1000);
 assert.equal(raw.subarray(4,8).toString(),'ftyp');
});
