import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { initialWorkspace } from '../lib/model.ts';
const base=resolve('dist/server');const files=(await readdir(base,{recursive:true})).filter(p=>p.endsWith('.js')||p.endsWith('.mjs'));files.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));const modules=files.map(p=>({type:'ESModule',path:resolve(base,p)}));
const mf=new Miniflare({modules,modulesRoot:base,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SETUP_KEY:'test-only-key-not-used-in-production-2026'},cf:false});
try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.exec(sql.replaceAll('\n',' '));}
 const root='https://unit.test';const headers={'Content-Type':'application/json',origin:root,'cf-connecting-ip':'192.0.2.5'};const workspace=initialWorkspace();
 const post=(url,body,extra={})=>mf.dispatchFetch(root+url,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
 const put=(body,extra={})=>mf.dispatchFetch(root+'/api/workspace',{method:'PUT',headers:{...headers,...extra},body:JSON.stringify(body)});
 assert.equal((await mf.dispatchFetch(root+'/api/workspace')).status,401);
 assert.equal((await post('/api/source-url',{url:'https://www.cbs.nl'})).status,401);
 // Forged platform identity is never trusted in independent hosting mode.
 assert.equal((await mf.dispatchFetch(root+'/api/workspace',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fake@example.test'}})).status,401);
 const st=await (await mf.dispatchFetch(root+'/api/auth/status')).json();assert.equal(st.configured,false);assert.equal(st.canSetup,false);
 assert.equal((await post('/api/auth/setup',{username:'marijn',password:'a-long-test-password'})).status,403);
 const setup=await post('/api/auth/setup',{username:'marijn',password:'a-long-test-password',setupKey:'test-only-key-not-used-in-production-2026'});assert.equal(setup.status,200,await setup.clone().text());
 let cookie=setup.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);const cookieHeader=()=>({'Cookie':cookie.split(';')[0]});
 assert.equal((await post('/api/auth/setup',{username:'someone',password:'another-strong-password',setupKey:'test-only-key-not-used-in-production-2026'})).status,409);
 // A forged second account is also rejected by the database constraint.
 await assert.rejects(()=>db.prepare("INSERT INTO account (id, username, password_hash, salt, workspace_user_id, version, created_at) VALUES (2,'x','x','x','x',1,'x')").run());
 const get=async(extra=cookieHeader())=>mf.dispatchFetch(root+'/api/workspace',{headers:extra});assert.equal((await (await get()).json()).revision,0);
 assert.equal((await post('/api/source-url',{url:'http://127.0.0.1'},cookieHeader())).status,422);
 assert.equal((await post('/api/source-url',{url:'https://unlisted.example.org'},cookieHeader())).status,422);
 assert.equal((await post('/api/source-url',{url:'https://www.cbs.nl'},{...cookieHeader(),origin:'https://evil.test'})).status,403);
 workspace.dossiers[0].sources=[{id:'test-source',name:'Lokale testbron.pdf',type:'pdf',url:'https://example.org/test',date:'2026-11-11',importedAt:'2026-11-11T12:00:00Z',hash:'test-hash',warning:'',pages:[{number:2,text:'Een tekort aan begeleidingscapaciteit bij kleine bedrijven.'}]}];
 workspace.dossiers[0].problem='Lokale test van eigen inlog';const save=await put({workspace,revision:0},cookieHeader());assert.equal(save.status,200,await save.clone().text());assert.equal((await save.json()).revision,1);
 assert.equal((await (await get()).json()).workspace.dossiers[0].problem,'Lokale test van eigen inlog');
 assert.equal((await (await get()).json()).workspace.dossiers[0].sources[0].pages[0].number,2);
 assert.equal((await put({workspace,revision:0},cookieHeader())).status,409);assert.equal((await put({workspace:{version:3,dossiers:[]},revision:1},cookieHeader())).status,400);
 assert.equal((await post('/api/auth/login',{username:'marijn',password:'wrong-password'})).status,401);
 const login=await post('/api/auth/login',{username:'MARIJN',password:'a-long-test-password'});assert.equal(login.status,200);const oldCookie=cookie;
 const changed=await post('/api/auth/change',{username:'marijn-nieuw',password:'new-long-test-password',currentPassword:'a-long-test-password'},cookieHeader());assert.equal(changed.status,200,await changed.clone().text());cookie=changed.headers.get('set-cookie');
 assert.equal((await get({Cookie:oldCookie.split(';')[0]})).status,401);assert.equal((await get({Cookie:login.headers.get('set-cookie').split(';')[0]})).status,401);
 assert.equal((await post('/api/auth/login',{username:'marijn',password:'a-long-test-password'})).status,401);
 assert.equal((await post('/api/auth/login',{username:'marijn-nieuw',password:'new-long-test-password'},{origin:'https://other.test'})).status,400);
 assert.equal((await post('/api/auth/recover',{username:'marijn',password:'recovery-long-password',setupKey:'wrong'})).status,403);
 const recover=await post('/api/auth/recover',{username:'marijn',password:'recovery-long-password',setupKey:'test-only-key-not-used-in-production-2026'});assert.equal(recover.status,200);assert.equal((await get()).status,401);cookie=recover.headers.get('set-cookie');assert.equal((await (await get()).json()).revision,1);
 const logout=await post('/api/auth/logout',{},cookieHeader());assert.equal(logout.status,200);assert.equal((await get()).status,401);
 for(let n=0;n<10;n++)assert.equal((await post('/api/auth/login',{username:'no',password:'no'},{'cf-connecting-ip':'192.0.2.88'})).status,401);
 assert.equal((await post('/api/auth/login',{username:'no',password:'no'},{'cf-connecting-ip':'192.0.2.88'})).status,429);
 const stored=await db.prepare('SELECT password_hash FROM account WHERE id=1').first();assert.notEqual(stored.password_hash,'recovery-long-password');assert.equal(stored.password_hash.length,64);
 console.log('Eigen authenticatie gecontroleerd: één account, geen registratie, hashes, cookies, sessies, behoud van werkruimte, reset, afmelden, rate limiting en invoervalidatie.');
}finally{await mf.dispose()}
// The temporary owner-private setup route must preserve an existing workspace.
const privateMf=new Miniflare({modules,modulesRoot:base,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ALLOW_PLATFORM_SETUP:'true'},cf:false});
try{
 const db=await privateMf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.exec(sql.replaceAll('\n',' '));
 const data=initialWorkspace();data.dossiers[0].problem='Bestaande werkruimte behouden';await db.prepare('INSERT INTO workspaces (user_id,payload,revision,updated_at) VALUES (?,?,?,?)').bind('existing-owner',JSON.stringify(data),7,'2026-11-11T14:00:00Z').run();
 const headers={'oai-authenticated-user-id':'existing-owner','oai-authenticated-user-email':'owner@example.test','Content-Type':'application/json'};
 const st=await (await privateMf.dispatchFetch('https://private.test/api/auth/status',{headers})).json();assert.equal(st.canSetup,true);
 const setup=await privateMf.dispatchFetch('https://private.test/api/auth/setup',{method:'POST',headers,body:JSON.stringify({username:'marijn',password:'owner-test-long-password'})});assert.equal(setup.status,200,await setup.clone().text());
 const cookie=setup.headers.get('set-cookie').split(';')[0];const restored=await (await privateMf.dispatchFetch('https://private.test/api/workspace',{headers:{Cookie:cookie}})).json();assert.equal(restored.revision,7);assert.equal(restored.workspace.dossiers[0].problem,'Bestaande werkruimte behouden');
 // Once configured, a platform login alone no longer grants data access.
 assert.equal((await privateMf.dispatchFetch('https://private.test/api/workspace',{headers})).status,401);
 console.log('Overstap vanaf bestaande privétool gecontroleerd: werkruimte en versie behouden.');
}finally{await privateMf.dispose()}
