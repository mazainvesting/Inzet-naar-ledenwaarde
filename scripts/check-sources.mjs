import assert from 'node:assert/strict';
import {sourcesSchema,proposeFromSources,proposalText} from '../lib/source-input.ts';
import {initialWorkspace,workspaceSchema} from '../lib/model.ts';
const s=(id,text)=>({id,name:id+'.pdf',type:'pdf',url:'https://example.org/'+id,date:'2026-11-11',importedAt:'2026-11-11T12:00:00Z',hash:id,warning:'',pages:[{number:2,text}]});
const sources=[s('a','Werkgevers ervaren een tekort aan tijd voor begeleiding van zij-instromers. Het doel is meer behoud van nieuwe medewerkers.'),s('b','Kleine bedrijven en praktijkopleiders werken samen met Wij Techniek. Uitval is een knelpunt bij zij-instromers.')];
assert.equal(sourcesSchema.safeParse(sources).success,true);
const result=proposeFromSources(sources,'Behoud zij-instromers');const problem=result.find(p=>p.field==='problem');assert.ok(problem);assert.equal(new Set(problem.refs.map(r=>r.sourceId)).size,2);assert.ok(problem.refs.every(r=>sources.find(s=>s.id===r.sourceId).pages.find(p=>p.number===r.page).text.includes(r.quote)));assert.match(proposalText(problem,sources),/a.pdf, p. 2/);assert.match(proposalText(problem,sources),/https:\/\/example.org\/b/);
assert.equal(result.some(p=>p.field==='mandate'),false);assert.equal(result.find(p=>p.field==='contribution').kind,'Werkvoorstel');
assert.equal(proposeFromSources([],'test').filter(p=>p.kind==='Bronpassages').length,0);
assert.equal(sourcesSchema.safeParse(Array.from({length:9},(_,i)=>s('s'+i,'text'))).success,false);
assert.equal(sourcesSchema.safeParse([s('x','x'.repeat(40001))]).success,false);
assert.equal(sourcesSchema.safeParse([{...sources[0],url:'javascript:alert(1)'}]).success,false);
assert.equal(sourcesSchema.safeParse([{...sources[0],date:'2026-02-30'}]).success,false);
const old=initialWorkspace();for(const d of old.dossiers)delete d.sources;const migrated=workspaceSchema.parse(old);assert.deepEqual(migrated.dossiers[0].sources,[]);
migrated.dossiers[0].sources=sources;assert.equal(workspaceSchema.safeParse(migrated).success,true);
assert.equal(migrated.dossiers[0].indicators.length,0);assert.equal(migrated.dossiers[0].evidence.length,0);
console.log('Bronlimieten, meerdere bronnen, paginaverwijzingen, veilige links, geen verzonnen mandaat en compatibiliteit met bestaande dossiers gecontroleerd.');

assert.equal(sourcesSchema.safeParse([{...sources[0],verification:'Gecontroleerd',verifiedAt:'',verificationNote:''}]).success,false);

const {parseSourceUrl,readableUrl,htmlToSource}=await import('../lib/source-url.ts');
assert.equal(readableUrl('https://trendfiles.wij-techniek.nl/test'),true);
assert.equal(readableUrl('https://www.cbs.nl.evil.example/test'),false);
for(const url of ['http://127.0.0.1','http://[::1]','http://localhost','https://user:password@www.cbs.nl','file:///etc/passwd','https://www.cbs.nl:8443'])assert.throws(()=>parseSourceUrl(url));
assert.equal(parseSourceUrl('https://www.cbs.nl/page#fragment').href,'https://www.cbs.nl/page');
const html=htmlToSource('<html><title>Bron &amp; cijfers</title><script>doevil()</script><main><h1>Tekort</h1><p>Werkgevers vragen begeleiding.</p><img src="x" alt="Diagram over instroom"/></main><footer>footer</footer></html>');
assert.equal(html.title,'Bron & cijfers');assert.match(html.text,/Werkgevers vragen begeleiding/);assert.match(html.text,/Alternatieve afbeeldingstekst/);assert.equal(html.text.includes('doevil'),false);assert.equal(html.text.includes('footer'),false);
console.log('URL-begrenzing, redirectsbeleid, IP-blokkade, HTML-extractie en verificatiestatus gecontroleerd.');
