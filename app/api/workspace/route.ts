import { principal } from '../../../lib/auth';
import { getDb } from '../../../db';
import { workspaces } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';
import { workspaceSchema } from '../../../lib/model';
export const dynamic='force-dynamic';
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 const user=await principal(req);if(!user)return respond({error:'Meld je aan om je werkruimte te openen.'},401);
 try{const row=await getDb().select().from(workspaces).where(eq(workspaces.userId,user.userId)).get();return respond({workspace:row?JSON.parse(row.payload):null,revision:row?.revision??0,updatedAt:row?.updatedAt??null});}
 catch{return respond({error:'Je werkruimte kon niet worden geladen. Probeer opnieuw.'},503)}
}
export async function PUT(req:Request){
 const user=await principal(req);if(!user)return respond({error:'Je sessie is verlopen. Meld je opnieuw aan.'},401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return respond({error:'Ongeldig verzoek.'},403);
 let raw;try{const body=await req.text();if(body.length>1800000)return respond({error:'De gegevens zijn te groot.'},413);raw=JSON.parse(body)}catch{return respond({error:'Ongeldige gegevens.'},400)}
 if(!raw||typeof raw!=='object')return respond({error:'Ongeldige gegevens.'},400);
 const parsed=workspaceSchema.safeParse(raw.workspace);if(!parsed.success||!Number.isInteger(raw.revision)||raw.revision<0)return respond({error:parsed.success?'Ongeldige versie.':parsed.error.issues[0].message},400);
 try{
 const db=getDb();const at=new Date().toISOString();const values={userId:user.userId,payload:JSON.stringify(parsed.data),revision:raw.revision+1,updatedAt:at};
 let saved;if(raw.revision===0){saved=await db.insert(workspaces).values(values).onConflictDoNothing().returning({revision:workspaces.revision}).get()}
 else{saved=await db.update(workspaces).set({payload:values.payload,revision:values.revision,updatedAt:at}).where(and(eq(workspaces.userId,user.userId),eq(workspaces.revision,raw.revision))).returning({revision:workspaces.revision}).get()}
 if(!saved)return respond({error:'Deze werkruimte is elders gewijzigd. Download je lokale versie en herlaad voordat je verdergaat.'},409);
 return respond({revision:saved.revision,updatedAt:at});
 }catch{return respond({error:'Opslaan is niet gelukt. Je invoer blijft in dit venster beschikbaar.'},503)}
}
