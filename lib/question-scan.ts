import type {DossierSource} from './source-input.ts';
import type {Question,ScanRun} from './question-model.ts';
export type ScanSource={dossierId:string;dossierTitle:string;source:DossierSource};
export type Candidate={key:string;text:string;kind:Question['kind'];dossierId:string;source:DossierSource;page:number;quote:string;reason:string};
export function fingerprint(value:string){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
const normalise=(text:string)=>text.toLowerCase().replace(/\s+/g,' ').replace(/[^\p{L}\p{N} ]/gu,'').trim();
export function questionScanKey(source:DossierSource,text:string){return 'scan-'+fingerprint(source.hash||source.id)+'-'+fingerprint(normalise(text));}
export function sourceNeedsScan(source:DossierSource,runs:ScanRun[]){return source.pages.some(p=>p.text.trim())&&!runs.some(r=>r.sourceId===source.id&&r.sourceHash===source.hash);}
export function scanQuestions(sources:ScanSource[],existing:Question[]=[]){const known=new Set(existing.map(q=>q.scanKey).filter(Boolean));const found=new Map<string,Candidate>();let totalDetected=0;const counts=new Map<string,number>();let truncated=false;
 for(const {source,dossierId} of sources){let count=0;const seen=new Set<string>();for(const page of source.pages){
 const paragraphs=page.text.replace(/\r/g,'').split(/\n\s*\n/);const chunks=paragraphs.flatMap(p=>p.split(/\n|(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9])/u));
 for(const raw of chunks){const text=raw.replace(/\s+/g,' ').trim();if(text.length<12)continue;let reason='',kind:Candidate['kind']='Vraag';
 if(text.includes('?'))reason='Vraagteken in de bron';
 else if(/\b(openstaande? vraag|vraagt? (?:om|of|aan)|verzoekt? (?:om|of)|graag (?:ontvangen|bevestigen|reactie|antwoord|aanleveren)|nog (?:onduidelijk|te beantwoorden)|wie (?:pakt|kan|gaat|is)|hoe (?:gaan|kunnen|wordt|werkt)|wanneer (?:komt|wordt|kunnen))\b/i.test(text))reason='Mogelijke vraag of verzoek om reactie';
 else if(/\bactie\s*[:\d]/i.test(text)||/\b(actiepunt|to[- ]?do|nader uitzoeken|uitzoeken|terugkoppelen|aanleveren|nog te besluiten|opvolgen|openstaand|neemt .* mee|zoekt .* uit|komt .* terug op)\b/i.test(text)){reason='Mogelijk actiepunt of vervolgafspraak';kind='Actiepunt';}
 if(!reason)continue;if(text.length>4000){truncated=true;continue;}const key=questionScanKey(source,text);if(seen.has(key))continue;seen.add(key);count++;totalDetected++;
 if(/\b(beantwoord|afgerond|afgehandeld|gesloten|opgelost)\b/i.test(text))reason+='; bron noemt mogelijk al afhandeling — controleer';
 if(known.has(key)||found.has(key))continue;if(found.size>=300){truncated=true;continue;}found.set(key,{key,text,kind,dossierId,source,page:page.number,quote:text,reason});
 }}counts.set(source.id,count);}
 return {candidates:[...found.values()],totalDetected,counts,truncated};
}
export function candidateQuestion(c:Candidate,id:string,day:string):Question{return {id,text:c.text,kind:c.kind,dossierId:c.dossierId,status:'Te beoordelen',origin:'Onbekend',requester:'',owner:'',priority:'Normaal',due:'',receivedAt:'',answer:'',answeredAt:'',nextStep:'Beoordeel of deze passage nog openstaat en wie een reactie verwacht.',sourceId:c.source.id,sourceName:c.source.name,sourceUrl:c.source.url,sourcePage:c.page,sourceQuote:c.quote,sourceHash:c.source.hash,scanKey:c.key,addedAt:day};}
