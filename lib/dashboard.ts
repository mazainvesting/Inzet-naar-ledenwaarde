import {coverage,coverageLabels,validity,latest,today} from './model.ts';
import type {Workspace,Dossier} from './model.ts';
import {isOpenQuestion} from './question-model.ts';
import {sourceNeedsScan} from './question-scan.ts';
export function dossierGaps(d:Dossier){const sections=['Aanpak','Aanpak','Aanpak','Aanpak','Aanpak','Meten','Draagvlak','Bewijs'];return coverage(d).map((filled,i)=>({label:coverageLabels[i],section:sections[i],filled})).filter(x=>!x.filled);}
export function dashboardState(w:Workspace,now=today()){
 const questions=(w.questions??[]).filter(isOpenQuestion);const review=questions.filter(q=>q.status==='Te beoordelen');const active=questions.filter(q=>q.status!=='Te beoordelen');
 const actions=w.dossiers.flatMap(d=>d.actions.map(a=>({...a,dossier:d}))).filter(a=>a.status!=='Afgerond');
 const missing=w.dossiers.flatMap(d=>dossierGaps(d).map(g=>({...g,dossier:d})));
 const results=w.dossiers.flatMap(d=>d.evidence.filter(e=>['Resultaat','Gebruik','Effect'].includes(e.kind)&&e.date<=now).map(e=>({...e,dossier:d}))).sort((a,b)=>b.date.localeCompare(a.date));
 const metrics=w.dossiers.flatMap(d=>d.indicators.map(i=>({indicator:i,dossier:d,measurement:latest(i,now)}))).filter(x=>x.measurement);
 const checks=w.dossiers.flatMap(d=>d.checks.filter(c=>validity(c,now)!=='Actueel vastgelegd').map(c=>({...c,dossier:d})));
 const sources=w.dossiers.flatMap(d=>d.sources.map(source=>({source,dossier:d})));
 const deadlines=[...active.filter(q=>q.due).map(q=>({id:q.id,kind:'Vraag' as const,title:q.text,due:q.due,owner:q.owner,dossierId:q.dossierId})),...actions.filter(a=>a.due).map(a=>({id:a.id,kind:'Actie' as const,title:a.title,due:a.due,owner:a.owner,dossierId:a.dossier.id}))].sort((a,b)=>a.due.localeCompare(b.due));
 return {questions,review,active,actions,missing,results,metrics,checks,sources,deadlines,overdue:deadlines.filter(x=>x.due<now),unscanned:sources.filter(x=>sourceNeedsScan(x.source,w.scanRuns??[])),unassigned:active.filter(q=>!q.owner||!w.dossiers.some(d=>d.id===q.dossierId)),withoutDue:active.filter(q=>!q.due),complete:w.dossiers.filter(d=>!dossierGaps(d).length)};
}
