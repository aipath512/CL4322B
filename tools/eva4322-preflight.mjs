#!/usr/bin/env node
// EVA-4322 preflight: does not call Cloudflare, modify remote data or print secrets.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const configFile=path.join(root,'wrangler.jsonc');
const generated=path.join(root,'wrangler.eva.generated.jsonc');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const command=process.argv[2]||'check';
function readConfig(){
 const raw=fs.readFileSync(configFile,'utf8');
 const config=JSON.parse(raw.replace(/^\s*\/\/[^\n]*$/gm,''));
 if(config.name!=='cl4322b')throw Error('Unexpected project name; refusing');
 const demo=config.d1_databases?.find(db=>db.binding==='DB');
 if(!demo||demo.database_name!=='tcs-instal-cunostinte')throw Error('Unexpected TCS demo binding; refusing');
 return config;
}
function safeDatabase(id,name){
 if(!UUID.test(id||''))throw Error('Provide a valid dedicated EVA database UUID');
 if(!/^[a-zA-Z][\w-]{2,63}$/.test(name||''))throw Error('Invalid dedicated EVA database name');
 const c=readConfig();
 if(name==='tcs-instal-cunostinte'||id===c.d1_databases.find(x=>x.binding==='DB').database_id)throw Error('Refusing TCS demo database');
 return c;
}
if(command==='check'){
 const config=readConfig();
 const items=['migrations/0002_eva_company_kb.sql','public/eva-4322-admin.html','functions/api/eva-4322-admin.js','functions/api/eva-4322.js','public/eva-4322-widget.js'];
 const missing=items.filter(p=>!fs.existsSync(path.join(root,p)));
 if(missing.length)throw Error('Missing: '+missing.join(', '));
 const sql=fs.readFileSync(path.join(root,items[0]),'utf8');
 if(!sql.includes('tenant_id TEXT NOT NULL')||!sql.includes('status IN')||!sql.includes('PRIMARY KEY (tenant_id, qa_id)'))throw Error('Invalid tenant KB schema');
 console.log(JSON.stringify({ok:true,project:config.name,files:items.length,existingDemoBinding:config.d1_databases.find(x=>x.binding==='DB').database_name,remoteChanges:false},null,2));
}else if(command==='render'){
 const id=process.env.EVA_DB_ID||'',name=process.env.EVA_DB_NAME||'eva-4322-tenants';
 const c=safeDatabase(id,name);
 if(c.d1_databases.some(x=>x.binding==='EVA_DB'))throw Error('EVA_DB already exists in source config; inspect manually');
 c.d1_databases.push({binding:'EVA_DB',database_name:name,database_id:id});
 fs.writeFileSync(generated,JSON.stringify(c,null,2)+'\n',{mode:0o600});
 console.log('Generated '+path.relative(root,generated)+' with dedicated EVA_DB binding; no Cloudflare changes.');
 console.log('Before deploying: compare against LIVE Pages settings using "npx wrangler pages download config cl4322b" in an authenticated checkout.');
}else if(command==='token'){
 // Only print once to operator terminal; avoid running this command in GitHub CI logs.
 const token=randomBytes(32).toString('base64url');
 const sha256=createHash('sha256').update(token).digest('hex');
 console.log('ADMIN_TOKEN (share privately with authorized owner): '+token);
 console.log('SHA256 (store only server-side as EVA_4322_ADMIN_SHA256 tenant entry): '+sha256);
}else{
 console.error('Usage: node tools/eva4322-preflight.mjs [check|render|token]');
 process.exitCode=2;
}
