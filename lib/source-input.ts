import { z } from 'zod';
export const sourceSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(250),type:z.enum(['pdf','text','paste','web','image','reference']),url:z.string().max(2000).refine(s=>!s||/^https?:\/\//i.test(s),'Gebruik een http(s)-link'),date:z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),'Gebruik een geldige brondatum'),importedAt:z.string().max(40),hash:z.string().max(100),warning:z.string().max(2000),verification:z.enum(['Nog controleren','Gecontroleerd']).default('Nog controleren'),verifiedAt:z.string().max(10).default(''),verificationNote:z.string().max(2000).default(''),pages:z.array(z.object({number:z.number().int().min(1),text:z.string().max(40000)})).min(1).max(100)}).refine(s=>s.pages.reduce((n,p)=>n+p.text.length,0)<=40000,'Maximaal 40.000 tekens per bron').refine(s=>s.verification!=='Gecontroleerd'||(s.verificationNote.trim().length>0&&/^\d{4}-\d{2}-\d{2}$/.test(s.verifiedAt)&&!isNaN(Date.parse(s.verifiedAt))&&new Date(s.verifiedAt).toISOString().slice(0,10)===s.verifiedAt),'Leg controledatum en bevinding vast bij een gecontroleerde bron');
export const sourcesSchema=z.array(sourceSchema).max(8).refine(ss=>ss.reduce((n,s)=>n+s.pages.reduce((m,p)=>m+p.text.length,0),0)<=240000,'Maximaal 240.000 tekens per dossier aan brontekst');
export type DossierSource=z.infer<typeof sourceSchema>;
export const fieldLabels={summary:'Korte samenvatting',problem:'Ledenprobleem',audience:'Doelgroep',goal:'Gewenste verandering',contribution:'Mijn bijdrage',mandate:'Mandaat en besluitvorming',partners:'Partners'} as const;
export type SourceField=keyof typeof fieldLabels;
export type Passage={sourceId:string,page:number,quote:string};
export type SourceProposal={field:SourceField;text:string;refs:Passage[];kind:'Bronpassages'|'Werkvoorstel';note:string};
const signals:Record<SourceField,RegExp>={summary:/techniek|onderwijs|arbeidsmarkt|opleiding|installatie|ontwikkeling|scholing|energie/i,problem:/tekort|knelpunt|probleem|uitval|uitstroom|belemmer|moeilijk|druk|onvoldoende|achterstand|zorg|uitdaging/i,audience:/leden|werkgever|bedrijven|werknemer|student|leerling|zij.instrom|mkb|monteur|docent|deelnemer|volwassen/i,goal:/doel|streven|verbeter|behoud|versterk|verhoog|verlaag|verminder|bereik|ambitie|toekomst/i,contribution:/techniek nederland|beleidsadviseur|belangenbehartig|lobby|agender|verbinden/i,mandate:/mandaat|besluit|verantwoordelijk|bevoegd|goedkeur|budgethouder|bestuur|directie/i,partners:/samenwerk|partner|wij techniek|sbb|opleidingsbedrijf|school|gemeente|ministerie|ocw|roc|mbo/i};
export function proposeFromSources(sources:DossierSource[],dossierTitle:string):SourceProposal[]{
 const all:Passage[]=[];
 for(const s of sources)for(const p of s.pages){const lines=p.text.replace(/\r/g,'').split(/\n\s*\n|(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9])/u);for(const line of lines){const q=line.replace(/\s+/g,' ').trim();if(q.length>=35&&q.length<=1600)all.push({sourceId:s.id,page:p.number,quote:q});else if(q.length>1600){for(let i=0;i<q.length;i+=1000)if(q.slice(i,i+1000).length>=35)all.push({sourceId:s.id,page:p.number,quote:q.slice(i,i+1000)});}}}
 const terms=dossierTitle.toLowerCase().split(/\W+/).filter(t=>t.length>4);
 const proposals:SourceProposal[]=[];
 for(const field of Object.keys(fieldLabels) as SourceField[]){
  if(field==='contribution') {proposals.push({field,kind:'Werkvoorstel',text:'Verifieer met leden welk knelpunt prioriteit heeft; breng relevante partners samen; leg afspraken en beslismomenten vast; volg wat leden merken en rapporteer je eigen aantoonbare bijdrage.',refs:[],note:'Advies voor je aanpak, geen vastgesteld mandaat of uitgevoerde activiteit. Pas aan aan jouw opdracht.'});continue;}
  const ranked=all.filter(p=>signals[field].test(p.quote)).map(p=>({...p,score:terms.filter(t=>p.quote.toLowerCase().includes(t)).length})).sort((a,b)=>b.score-a.score);
  const picked:Passage[]=[];const seen=new Set<string>();
  // Spread passages across sources first; no false majority or conflict resolution.
  for(const s of sources){const p=ranked.find(p=>p.sourceId===s.id&&!seen.has(p.quote));if(p&&picked.length<4){picked.push(p);seen.add(p.quote)}}
  for(const p of ranked){if(picked.length>=4)break;if(!seen.has(p.quote)){picked.push(p);seen.add(p.quote)}}
  if(picked.length)proposals.push({field,kind:'Bronpassages',text:picked.map(p=>p.quote).join('\n\n'),refs:picked,note:field==='mandate'?'Een besluit in een bron is niet automatisch jouw mandaat. Bevestig dit met de opdrachtgever.':'Letterlijke selectie uit maximaal vier bronnen per veld. Controleer relevantie, periode, doelgroep en eventuele tegenstrijdigheden. Dit is geen vrije AI-synthese.'});
 }
 return proposals;
}
export function referenceLabel(ref:Passage,sources:DossierSource[]){const s=sources.find(s=>s.id===ref.sourceId);return `${s?.name??'Verwijderde bron'}, p. ${ref.page}${s?.date?' (brondatum '+s.date+')':''}${s?.verification==='Gecontroleerd'?' [door gebruiker gecontroleerd '+s.verifiedAt+']':' [nog controleren]'}${s?.url?' — '+s.url:''}`;}
export function proposalText(proposal:SourceProposal,sources:DossierSource[]){return proposal.text+(proposal.refs.length?'\n\nBronverwijzingen:\n'+Array.from(new Set(proposal.refs.map(r=>referenceLabel(r,sources)))).join('\n'):'\n\n[Werkvoorstel — nog afspreken en onderbouwen]');}
