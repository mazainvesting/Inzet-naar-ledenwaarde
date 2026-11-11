import {sessions} from '../../../../db/schema';
import {getDb} from '../../../../db';
import {eq} from 'drizzle-orm';
import {authResponse,clearSessionCookie,ownSession,readBody} from '../../../../lib/auth';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{await readBody(req);const s=await ownSession(req);if(s)await getDb().delete(sessions).where(eq(sessions.tokenHash,s.tokenHash));return authResponse({ok:true},200,clearSessionCookie());}catch{return authResponse({error:'Uitloggen mislukt.'},400)}}
