const R=window.RESULT;R.fail=[];
S.home='iPad';store.set('bl.home','iPad');
const playMath=(mode,wrongFirst)=>{start(mode);let n=0;while(S.view==='run'&&n++<40){const q=run.qs[run.i];if(wrongFirst&&run.i===0){guidedSubmit('zzz');}guidedSubmit(q.ans);if(run.st[run.i].done)act('next');}return run.result};
const a=playMath('smart');
R.first={stars:a.stars,rep:a.rep,correct:a.correct,total:a.total};
S.learn=null;S.view='home';
const b=playMath('smart');
R.second={stars:b.stars,rep:b.rep};
const c=playMath('guided');
R.otherMode={stars:c.stars,rep:c.rep};
if(!(a.stars>0)||a.rep)R.fail.push('first should score');
if(b.stars!==0||!b.rep)R.fail.push('second smart should be 0');
if(!(c.stars>0))R.fail.push('guided should score');
// hints: progressive and half credit
start('guided');const q=run.qs[0];act('hint');const h1=run.st[0].hn;act('hint');const h2=run.st[0].hn;
R.hint={steps:q.hints.length,h1,h2};
if(q.hints.length>1&&!(h2===2&&h1===1))R.fail.push('hint progression');
// wrong then right = helped
run.st[0].hint=false;run.st[0].hn=0;guidedSubmit('zzz');R.afterWrong=run.st[0].hn;guidedSubmit(q.ans);R.helped=run.st[0].helped;
if(R.afterWrong!==1||!R.helped)R.fail.push('wrong first');
// spaced review
const day=86400000,now=nowMs();
S.sessions=[];
S.sessions.push({id:'a',ts:now-2*day,mode:'smart',total:3,correct:1,stars:5,items:[{t:'divrem',ok:0,h:0},{t:'divrem',ok:0,h:0},{t:'mean',ok:1,h:0}]});
S.sessions.push({id:'b',ts:now-2*day,mode:'spell',total:2,correct:1,stars:5,items:[{t:'sp',g:'cards',w:'because',ok:0,h:0},{t:'sp',g:'cards',w:'knee',ok:1,h:0}]});
S.sessions.push({id:'c',ts:now-5*day,mode:'es',total:1,correct:0,stars:1,items:[{t:'es',g:'es2en',w:ES_ALL[0].id,ok:0,h:0}]});
S.sessions.push({id:'d',ts:now-1*day,mode:'geo',total:1,correct:1,stars:3,items:[{t:'geo',g:'pcap',w:'FL',ok:1,h:1}]});
R.due={math:srsDueNow('math').map(x=>x.key),spell:srsDueNow('spell').map(x=>x.key),es:srsDueNow('es').length,geo:srsDueNow('geo').map(x=>x.key)};
reviewStart('spell');R.spRv=!!(sp&&sp.rv);R.spWords=sp&&sp.words;
S.view='home';reviewStart('math');R.mathRv=run&&run.rv;R.mathTypes=run&&run.qs.map(q=>q.type).join(',');
reviewStart('es');R.esGame=es&&es.game;
reviewStart('geo');R.geoGame=geo&&geo.game;R.geoQ=geo&&geo.qs.map(q=>q.kind).join(',');
if(!R.due.math.includes('divrem')||!R.due.spell.includes('because')||R.due.es<1||!R.due.geo.includes('FL'))R.fail.push('due lists '+JSON.stringify(R.due));
if(R.due.spell.includes('knee'))R.fail.push('clean word not due');
// levels
S.sessions=[];for(let i=0;i<8;i++)S.sessions.push({id:'x'+i,ts:now-i*1000,mode:'smart',total:1,correct:1,stars:1,items:[{t:'mean',ok:1,h:0}]});
const lv3=mathLevel('mean');
S.sessions=[];for(let i=0;i<8;i++)S.sessions.push({id:'y'+i,ts:now-i*1000,mode:'smart',total:1,correct:0,stars:1,items:[{t:'mean',ok:0,h:0}]});
const lv1=mathLevel('mean');
R.levels={lv3,lv1,none:mathLevel('lcm')};
const avg=l=>{let s=0;for(let i=0;i<40;i++)s+=qDifficulty(makeQL('divrem','type',l));return s/40};
R.diff={l1:avg(1),l2:avg(2),l3:avg(3)};
if(lv3!==3||lv1!==1||R.levels.none!==2)R.fail.push('levels');
if(!(R.diff.l1<R.diff.l2&&R.diff.l2<R.diff.l3))R.fail.push('difficulty order');
