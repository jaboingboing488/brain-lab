const R=window.RESULT;R.fail=[];
store.set('bl.birth',2015);S.home='iPad';
/* 365 prizes */
R.prizes=prizeCount().total;if(R.prizes!==365)R.fail.push('prize total '+R.prizes);
/* the birthday: December 17 is double stars and age 11, the week after is belated, then it quiets down */
const asOf=(y,m,d)=>{window.__NOW=new Date(y,m-1,d,12).getTime()};
asOf(2026,12,17);R.bday=isBday();R.age=bdayAge();R.card=bdayCard().includes('11TH');
R.double=sessStars('math','play',10)===2*(10*2+4);
asOf(2026,12,19);R.belated=bdayCard().includes('BELATED');
asOf(2026,12,26);R.quiet=bdayCard()==='';
if(!R.bday||R.age!==11||!R.card||!R.double||!R.belated||!R.quiet)R.fail.push('birthday '+JSON.stringify([R.bday,R.age,R.card,R.double,R.belated,R.quiet]));
/* touchdown kicks come from synced data: touchdowns earned minus kicks taken */
asOf(2026,10,20);const now=nowMs(),DAY=86400000;S.sessions=[];
for(let i=0;i<6;i++)S.sessions.push({id:'k'+i,ts:now-i*DAY,mode:'smart',total:1,correct:1,stars:100,items:[{t:'mean',ok:1,h:0}]});
R.stars=totalStars();R.pending0=tdPending();tdKick();R.pending1=tdPending();R.kicks=store.get('bl.kicks',0);
if(R.stars<400||R.pending0!==1||R.pending1!==0||R.kicks!==1)R.fail.push('kicks '+JSON.stringify([R.stars,R.pending0,R.pending1,R.kicks]));
/* every finished session fits the database rules */
const bad=[];
const ok=s=>s.items.length===s.total&&s.total>=1&&s.total<=20&&s.correct>=0&&s.correct<=s.total&&Number.isInteger(s.stars)&&s.stars>=0&&s.stars<=100&&['smart','guided','exam','spell','es','geo','nfl'].includes(s.mode)&&typeof s.home==='string'&&s.home.length<=20&&s.secs>=0&&s.secs<=7200;
S.sessions=[];
start('smart');let n=0;while(S.view==='run'&&n++<40){const q=run.qs[run.i];guidedSubmit(q.ans);if(run.st[run.i].done)act('next')}
S.view='home';startSpell('test');n=0;while(S.view==='sprun'&&n++<40){const it=sp.items[sp.i];const el=document.getElementById('spin');if(el)el.value=it.w;act('spnext')}
S.view='home';geoStart('gtest');n=0;while(S.view==='grun'&&n++<40){const q=geo.qs[geo.i];geoSubmit(q.ans);if(geo.st[geo.i].done)act('gnext')}
S.view='home';esStart('test');n=0;while(S.view==='esrun'&&n++<40){const q=es.qs[es.i];esSubmit(q.ans);if(es.st[es.i].done)act('esnext')}
S.view='home';startQuiz('quiz');n=0;while(S.view==='nqrun'&&n++<40){const q=nq.qs[nq.i];nqPick(q.opts.indexOf(q.ans));act('nqnext')}
R.checked=S.sessions.length;S.sessions.forEach(s=>{if(!ok(s))bad.push(s.mode+' '+JSON.stringify([s.total,s.items.length,s.stars,s.correct]))});
if(R.checked<5||bad.length)R.fail.push('rules shape '+bad.join(';')+' of '+R.checked);
/* no session item may carry an undefined value (the database refuses those) */
const undef=[];S.sessions.forEach(s=>s.items.forEach(i=>Object.entries(i).forEach(([k,v])=>{if(v===undefined)undef.push(s.mode+'.'+k)})));
if(undef.length)R.fail.push('undefined in '+[...new Set(undef)].join());
