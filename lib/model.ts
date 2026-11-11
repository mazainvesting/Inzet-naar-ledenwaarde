import {questionSchema,scanRunSchema} from './question-model.ts';
import { sourcesSchema } from './source-input.ts';
import { z } from 'zod';
const text = z.string().max(12000);
const short = z.string().max(250);
export const date = z.string().refine(v => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v), 'Gebruik een geldige datum');
const id = z.string().min(1).max(100);
const indicatorBase = z.object({id,name:short,unit:short,definition:text,source:text,owner:short,direction:z.enum(['up','down']),baseline:z.number().finite().nullable(),baselineDate:date,target:z.number().finite().nullable(),due:date,measurements:z.array(z.object({id,date,value:z.number().finite(),note:text})).max(500)});
export const indicatorSchema = indicatorBase.superRefine((v,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(v.baseline!==null&&v.target!==null&&((v.direction==='up'&&v.target<v.baseline)||(v.direction==='down'&&v.target>v.baseline)))issue('De streefwaarde past niet bij de richting');
 const dates=new Set<string>();for(const m of v.measurements){if(!m.date)issue('Een meetmoment moet een datum hebben');if(dates.has(m.date))issue('Meerdere metingen op dezelfde datum');dates.add(m.date)}
});
export const actionSchema = z.object({id,title:short,owner:short,due:date,status:z.enum(['Open','Bezig','Afgerond']),hours:z.number().nonnegative().finite().nullable()});
export const consultationSchema = z.object({id,date,group:short,selection:text,asked:z.number().int().min(1),support:z.number().int().min(0),against:z.number().int().min(0),neutral:z.number().int().min(0),unknown:z.number().int().min(0),recognition:text,feasibility:text,conditions:text}).refine(c=>c.support+c.against+c.neutral+c.unknown===c.asked,'Alle antwoorden samen moeten gelijk zijn aan het aantal respondenten');
export const evidenceSchema = z.object({id,date,title:short,kind:z.enum(['Inzet','Resultaat','Gebruik','Effect']),source:text,detail:text,contribution:text,limits:text});
const checkBase = z.object({id,title:short,url:z.string().max(2000).refine(s=>!s || /^https?:\/\//i.test(s),'Gebruik een http of https link'),lastChecked:date,nextCheck:date,outcome:z.enum(['Nog controleren','Actueel','Aanpassen','Onzeker']),note:text});
export const checkSchema=checkBase.superRefine((v,ctx)=>{
 if(v.outcome!=='Nog controleren'&&(!v.lastChecked||!v.note.trim()))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Een beoordeling vraagt een controledatum en bevinding'});
 if(v.lastChecked&&v.nextCheck&&v.nextCheck<v.lastChecked)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Hercontrole moet na de controledatum liggen'});
});
export const reportSchema = z.object({id,quarter:z.string().regex(/^\d{4}-Q[1-4]$/),date,contribution:text,change:text,benefit:text,decision:text,choice:z.enum(['Nog bepalen','Doorgaan','Aanpassen','Wachten','Stoppen'])});
export const dossierSchema=z.object({id,title:short.min(1),code:short,summary:text,priority:z.enum(['Nog bepalen','Prioriteit','Volgen']),stage:z.enum(['Verkennen','Afstemmen','Uitvoeren','Evalueren','Afgerond']),owner:short,problem:text,audience:text,goal:text,contribution:text,mandate:text,partners:text,indicators:z.array(indicatorSchema).max(100),actions:z.array(actionSchema).max(300),consultations:z.array(consultationSchema).max(200),evidence:z.array(evidenceSchema).max(500),checks:z.array(checkSchema).max(100),reports:z.array(reportSchema).max(100),sources:sourcesSchema.default([])});
export const workspaceSchema=z.object({version:z.literal(1),dossiers:z.array(dossierSchema).max(100),questions:z.array(questionSchema).max(500).default([]),scanRuns:z.array(scanRunSchema).max(800).default([])}).superRefine((w,ctx)=>{
 const seen=new Set<string>(); const add=(v:string)=>{if(seen.has(v))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Dubbele identificatie in gegevens'});seen.add(v)};
 for(const q of w.questions)add(q.id);
 for(const d of w.dossiers){add(d.id);for(const source of d.sources??[])add(source.id);for(const key of ['indicators','actions','consultations','evidence','checks','reports'] as const)for(const x of d[key]){add(x.id);if('measurements' in x)for(const m of x.measurements)add(m.id)}}
});
export type Workspace=z.infer<typeof workspaceSchema>; export type Dossier=z.infer<typeof dossierSchema>; export type Indicator=z.infer<typeof indicatorSchema>;
export const uid=()=>crypto.randomUUID();
export function today(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Amsterdam'})}
export function currentQuarter(){const t=today();return `${t.slice(0,4)}-Q${Math.ceil(Number(t.slice(5,7))/3)}`}
export function latest(i:Indicator,until='9999-12-31'){return i.measurements.filter(m=>m.date&&m.date<=until).slice().sort((a,b)=>b.date.localeCompare(a.date))[0]}
export function progress(i:Indicator,until?:string){const m=latest(i,until);if(!m||i.baseline===null||i.target===null||i.target===i.baseline)return null;return (m.value-i.baseline)/(i.target-i.baseline)*100}
export function validity(c:Dossier['checks'][number],now=today()){if(c.outcome==='Aanpassen')return 'Aanpassen';if(c.outcome==='Onzeker')return 'Onzeker';if(!c.lastChecked||c.outcome==='Nog controleren')return 'Nog controleren';if(c.nextCheck&&c.nextCheck<now)return 'Hercontrole nodig';return c.nextCheck?'Actueel vastgelegd':'Termijn ontbreekt'}
export function coverage(d:Dossier){return [!!d.problem.trim(),!!d.audience.trim(),!!d.goal.trim(),!!d.contribution.trim(),!!d.mandate.trim(),d.indicators.some(i=>i.baseline!==null&&!!i.baselineDate&&i.target!==null&&!!i.due&&!!i.definition&&!!i.source&&!!i.owner),d.consultations.length>0,d.evidence.length>0]}
export const coverageLabels=['Ledenprobleem','Doelgroep','Gewenste verandering','Eigen bijdrage','Mandaat','Meetafspraak','Raadpleging','Bewijs'];
const mk=(id:string,code:string,title:string,summary:string,goal:string,partners:string,checks:Dossier['checks'])=>({id,code,title,summary,goal,partners,priority:'Nog bepalen',stage:'Verkennen',owner:'Marijn',problem:'',audience:'',contribution:'',mandate:'',indicators:[],actions:[],consultations:[],evidence:[],checks,reports:[],sources:[]}) as Dossier;
const ck=(id:string,title:string,url:string)=>({id,title,url,lastChecked:'',nextCheck:'',outcome:'Nog controleren',note:''}) as Dossier['checks'][number];
export function initialWorkspace():Workspace{return {version:1,questions:[],scanRuns:[],dossiers:[
 mk('sto','01','Sterk Techniekonderwijs','Van techniekoriëntatie naar een passende vervolgopleiding.','Voorstel: verbeter de aansluiting tussen technisch vmbo, vervolgonderwijs en installatiebedrijven.','STO-regio’s, mbo, Techkwadraat, lidbedrijven en Wij Techniek',[ck('sto-1','STO regeling en regionale plannen','https://www.dus-i.nl/subsidies/voortgezet-onderwijs/sterk-techniekonderwijs-2025'),ck('sto-2','Samenhang met Techkwadraat','https://www.dus-i.nl/subsidies/primair-onderwijs/techkwadraat')]),
 mk('infra','02','Opleidingsinfrastructuur','Bereikbare scholing en praktijkvoorzieningen voor bedrijven.','Voorstel: benut bestaande capaciteit en maak samenwerking en financiering uitvoerbaar voor het mkb.','Mbo, opleidingsbedrijven, bedrijfsvakscholen, lidbedrijven en Wij Techniek',[ck('infra-1','Voortgang mbo bekostiging','https://wetgevingskalender.overheid.nl/Regeling/WGK027208'),ck('infra-2','RIF voorwaarden en mogelijkheden','https://www.dus-i.nl/subsidies/middelbaar-beroepsonderwijs/regionaal-investeringsfonds-mbo')]),
 mk('docenten','03','Hybride docenten','Praktijkkennis voor de klas, met een werkbare combinatie.','Voorstel: maak passende routes, begeleiding en arbeidsafspraken toegankelijk.','Scholen, lerarenopleidingen, vakmensen, werkgevers en Wij Techniek',[ck('docent-1','Bevoegdheidsroutes en gastdocentschap','https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/werken-in-het-onderwijs/hoe-word-ik-zijinstromer-in-het-onderwijs'),ck('docent-2','Trajecten en vergoedingsvoorwaarden','https://www.wij-techniek.nl/praktijkbegeleiders/hybride-techniekopleider')]),
 mk('personeel','04','Technisch personeel','Instroom, ontwikkeling, behoud en slimmer werken.','Voorstel: versterk duurzame inzetbaarheid en benut beschikbare capaciteit beter.','Lidbedrijven, sociale partners, Wij Techniek en Aanvalsplan Bouw, Energie en Techniek',[ck('pers-1','Actuele arbeidsmarktontwikkelingen','https://trendfiles.wij-techniek.nl/arbeidsmarktontwikkelingen-in-de-technische-installatiebranche-2026/'),ck('pers-2','Techniekroute en regionale uitvoering','https://aanvalsplantechniek.nl/')])
]}}
export function quarterEnd(q:string){const [year,n]=q.split('-Q').map(Number);return new Date(Date.UTC(year,n*3,0)).toISOString().slice(0,10)}
export function inQuarter(date:string,q:string){return !!date && date.slice(0,4)===q.slice(0,4)&&Math.ceil(Number(date.slice(5,7))/3)===Number(q.slice(-1))}
export function validateImport(input:unknown){return workspaceSchema.safeParse(input)}
