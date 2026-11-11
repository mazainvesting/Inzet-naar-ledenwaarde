import {readFile,writeFile} from 'node:fs/promises';
const databaseId=process.env.CLOUDFLARE_D1_DATABASE_ID;
if(!databaseId||!/^[a-f0-9-]{36}$/i.test(databaseId))throw new Error('Stel CLOUDFLARE_D1_DATABASE_ID in op het id van je eigen D1-database.');
const built=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
const config={name:'inzet-naar-ledenwaarde',main:'index.js',compatibility_date:built.compatibility_date,compatibility_flags:built.compatibility_flags,no_bundle:true,rules:[{type:'ESModule',globs:['**/*.js','**/*.mjs']}],assets:{directory:'../client'},d1_databases:[{binding:'DB',database_name:'ledenwaarde',database_id:databaseId,migrations_dir:'../../drizzle'}],observability:{enabled:true}};
await writeFile('dist/server/wrangler.standalone.json',JSON.stringify(config,null,2)+'\n');
console.log('Zelfstandige Cloudflare configuratie aangemaakt. Bestaande Sites configuratie blijft behouden.');
