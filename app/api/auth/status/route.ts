import {env} from 'cloudflare:workers';
import {readAccount,ownSession,setupPermission,authResponse} from '../../../../lib/auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const a=await readAccount();const session=a?await ownSession(req,a):null;return authResponse({configured:!!a,authenticated:!!session,username:session?.username??null,canSetup:!a&&!!await setupPermission(null),setupKeyAvailable:!!env.SETUP_KEY&&env.SETUP_KEY.length>=32,platformGate:env.ALLOW_PLATFORM_SETUP==='true'});}catch{return authResponse({error:'De aanmelding is tijdelijk niet beschikbaar.'},503)}}
