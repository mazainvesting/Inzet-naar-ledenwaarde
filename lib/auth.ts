import { env } from 'cloudflare:workers';
import { getDb } from '../db';
import { account, sessions, loginAttempts } from '../db/schema';
import { eq, lt, sql } from 'drizzle-orm';
import { getChatGPTUser } from '../app/chatgpt-auth';

const COOKIE='__Host-ledenwaarde';
const LIFETIME=8*60*60*1000;
const encoder=new TextEncoder();
const hex=(buffer:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(buffer)).map(v=>v.toString(16).padStart(2,'0')).join('');
const unhex=(value:string)=>new Uint8Array(value.match(/.{2}/g)?.map(v=>parseInt(v,16))??[]);
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const hashToken=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export function equalSecret(a:string,b:string){const aa=encoder.encode(a),bb=encoder.encode(b);let result=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)result|=(aa[i]??0)^(bb[i]??0);return result===0}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations:100000},key,256))}
export async function credential(password:string){const salt=hex(crypto.getRandomValues(new Uint8Array(16)));return {salt,passwordHash:await passwordHash(password,salt)}}
export async function readAccount(){return getDb().select().from(account).where(eq(account.id,1)).get()}
export async function ownSession(req:Request,a?:Awaited<ReturnType<typeof readAccount>>){const acc=a??await readAccount();if(!acc)return null;const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;const record=await getDb().select().from(sessions).where(eq(sessions.tokenHash,await hashToken(raw))).get();return record&&record.expiresAt>Date.now()&&record.version===acc.version?{userId:acc.workspaceUserId,username:acc.username,tokenHash:record.tokenHash}:null}
export async function principal(req:Request){const a=await readAccount();if(a)return ownSession(req,a);if(env.ALLOW_PLATFORM_SETUP==='true'){const u=await getChatGPTUser();return u?{userId:u.userId,username:u.displayName}:null}return null}
export async function setupPermission(key:unknown){if(env.SETUP_KEY&&env.SETUP_KEY.length>=32&&typeof key==='string'&&equalSecret(key,env.SETUP_KEY))return {userId:'single-owner'};if(env.ALLOW_PLATFORM_SETUP==='true'){const u=await getChatGPTUser();if(u)return {userId:u.userId}}return null}
export function recoveryPermission(key:unknown){return !!(env.SETUP_KEY&&env.SETUP_KEY.length>=32&&typeof key==='string'&&equalSecret(key,env.SETUP_KEY))}
export async function makeSession(version:number){const token=randomToken();await getDb().delete(sessions).where(lt(sessions.expiresAt,Date.now()));await getDb().insert(sessions).values({tokenHash:await hashToken(token),version,expiresAt:Date.now()+LIFETIME});return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${LIFETIME/1000}`}
export function clearSessionCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
export function authResponse(body:unknown,status=200,cookie?:string){const headers:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(cookie)headers['Set-Cookie']=cookie;return Response.json(body,{status,headers})}
export async function readBody(req:Request){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Error('Ongeldig verzoek.');const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('Ongeldig verzoek.');const body=await req.text();if(body.length>8192)throw new Error('Ongeldig verzoek.');const value=JSON.parse(body);if(!value||typeof value!=='object')throw new Error('Ongeldig verzoek.');return value as Record<string,unknown>}
export function validateCredentials(v:Record<string,unknown>){if(typeof v.username!=='string'||!/^[a-zA-Z0-9._@-]{3,80}$/.test(v.username))throw new Error('Kies een gebruikersnaam van 3 tot 80 letters, cijfers of . _ @ -');if(typeof v.password!=='string'||v.password.length<12||v.password.length>256)throw new Error('Gebruik een wachtwoord van 12 tot 256 tekens.');return {username:v.username.toLowerCase(),password:v.password}}
export async function rateLimit(req:Request,kind:string){const ip=req.headers.get('cf-connecting-ip')||'unknown';const window=15*60*1000;const now=Date.now();const key=kind+':'+await hashToken(ip)+':'+Math.floor(now/window);const db=getDb();await db.delete(loginAttempts).where(lt(loginAttempts.expiresAt,now));const row=await db.insert(loginAttempts).values({key,attempts:1,expiresAt:now+window}).onConflictDoUpdate({target:loginAttempts.key,set:{attempts:sql`${loginAttempts.attempts}+1`}}).returning({attempts:loginAttempts.attempts}).get();return (row?.attempts??100)>10}
