import {eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {account,sessions} from '../../../../db/schema';
import {authResponse,readBody,readAccount,recoveryPermission,rateLimit,validateCredentials,credential,makeSession} from '../../../../lib/auth';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const b=await readBody(req);if(await rateLimit(req,'recover'))return authResponse({error:'Te veel pogingen. Probeer later opnieuw.'},429);if(!recoveryPermission(b.setupKey))return authResponse({error:'Een geldige herstelcode is nodig.'},403);const a=await readAccount();if(!a)return authResponse({error:'Er is nog geen account ingesteld.'},409);const input=validateCredentials(b);const c=await credential(input.password);await getDb().batch([getDb().update(account).set({...c,username:input.username,version:a.version+1}).where(eq(account.id,1)),getDb().delete(sessions)]);return authResponse({ok:true},200,await makeSession(a.version+1));}catch(e){return authResponse({error:e instanceof Error&&/gebruikersnaam|wachtwoord|verzoek/i.test(e.message)?e.message:'Herstellen is niet gelukt.'},400)}}
