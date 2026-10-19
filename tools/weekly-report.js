// Brain Lab weekly report.
//   node weekly-report.js report FAMILY_KEY [YYYY-MM-DD as "today"]
//   node weekly-report.js csv FAMILY_KEY YYYY-MM
//   node weekly-report.js months FAMILY_KEY
// Reads the practice history from the private family space, in Eastern time. Needs Node 16+ and curl.
// FAMILY_KEY is the long secret from the family link. It is never stored in this repo. The word "legacy" reads the old open location (used once, to check the move).
const PROJECT='brain-lab-b0e8c',ET='America/New_York';
const dayKey=ts=>new Intl.DateTimeFormat('en-CA',{timeZone:ET,year:'numeric',month:'2-digit',day:'2-digit'}).format(ts);
const timeOf=ts=>new Intl.DateTimeFormat('en-US',{timeZone:ET,hour:'numeric',minute:'2-digit'}).format(ts);
const keyAdd=(k,n)=>{const[y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10)};
const dow=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay()};
const dec=v=>{if('integerValue' in v)return +v.integerValue;if('doubleValue' in v)return +v.doubleValue;if('stringValue' in v)return v.stringValue;if('booleanValue' in v)return v.booleanValue;
  if('arrayValue' in v)return(v.arrayValue.values||[]).map(dec);if('mapValue' in v){const o={};for(const k in(v.mapValue.fields||{}))o[k]=dec(v.mapValue.fields[k]);return o}return null};
const base=key=>`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`+(key==='legacy'?'':`/fam/${key}`);
/* curl is used instead of fetch because it follows the proxy settings of sandboxes and servers */
const curl=(args)=>require('child_process').execFileSync('curl',['-sS','--fail',...args],{maxBuffer:100*1024*1024}).toString();
function fetchAll(key){
  const url=base(key)+':runQuery',out=[];let before=null;
  for(;;){
    const q={from:[{collectionId:'sessions'}],orderBy:[{field:{fieldPath:'ts'},direction:'DESCENDING'}],limit:500};
    if(before!=null)q.where={fieldFilter:{field:{fieldPath:'ts'},op:'LESS_THAN',value:{doubleValue:before}}};
    const rows=JSON.parse(curl(['-X','POST','-H','content-type: application/json','-d',JSON.stringify({structuredQuery:q}),url])).filter(x=>x.document);
    rows.forEach(x=>{const o={id:x.document.name.split('/').pop()};for(const k in x.document.fields)o[k]=dec(x.document.fields[k]);out.push(o)});
    if(rows.length<500)break;before=out[out.length-1].ts;
  }
  return out.sort((a,b)=>a.ts-b.ts);
}
function fetchProfile(key){
  try{const d=JSON.parse(curl([base(key)+'/profile/emmett']));const o={};for(const k in(d.fields||{}))o[k]=dec(d.fields[k]);return o}catch(e){return{}}
}
const SUBJ={math:'Math',spell:'Spelling',es:'Spanish',geo:'Geography',nfl:'Football'};
const SPN={cards:'Look, Cover, Write',test:'Practice Test',sent:'Fill the Sentence',write:'Write a Sentence',scramble:'Unscramble',fill:'Complete the Word',hunt:'Word Hunt',spot:'Spot the Right Spelling',review:'Spaced review'};
const ESN={es2en:'Pick the English',en2es:'Pick the Spanish',listen:'Listen and pick',type:'Type the Spanish',tiles:'Letter tiles',test:'Spanish Test',review:'Spaced review'};
const GN={gtest:'Capitals Test',wcap:'Write the Capital',wstate:'Write the State',map:'Find the State',pcap:'Pick the Capital',pstate:'Pick the State',fl:'Florida Quiz',review:'Spaced review'};
const NN={quiz:'Game Day Quiz',draft:'Division Draft',rules:'Rookie Rules'};
const MN={smart:'Smart Practice',guided:'Guided Practice',exam:'Practice Exam'};
const TN={words:'Number words',mul_round:'Thousands × hundreds',mul_multi:'Multi-digit multiplication',divword:'Division word problems',divrem:'Division with remainders',mode:'Mode',mean:'Mean',median:'Median',range:'Range',addfrac:'Adding unlike fractions',simplify:'Simplifying fractions',gcf:'Greatest common factor',lcm:'Least common multiple',factors:'Counting factors'};
/* older Spanish sessions were saved as spelling sessions tagged t:'es' */
const subjOf=s=>s.mode==='es'?'es':s.mode==='spell'?((s.items||[])[0]&&s.items[0].t==='es'?'es':'spell'):s.mode==='geo'?'geo':s.mode==='nfl'?'nfl':'math';
function info(s){
  const sub=subjOf(s),items=s.items||[],it=items[0]||{};
  let activity;
  if(sub==='math'){const ts=new Set(items.map(i=>i.t));activity=items.length&&items.every(i=>i.rv)?'Spaced review':(s.mode==='guided'&&ts.size===1?(TN[[...ts][0]]||[...ts][0]):MN[s.mode]||s.mode)}
  else activity=({spell:SPN,es:ESN,geo:GN,nfl:NN}[sub]||{})[it.g]||it.g||'';
  const clean=items.filter(i=>i.ok&&!i.h).length,helped=items.filter(i=>i.ok&&i.h).length;
  const lv=items.filter(i=>i.lv);
  return{sub,subject:SUBJ[sub],activity,review:activity==='Spaced review',clean,helped,level:lv.length?Math.round(lv.reduce((n,i)=>n+i.lv,0)/lv.length*10)/10:''};
}
const csvCell=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function csv(sessions,month){
  const head=['Date','Day','Week of (Mon)','Time (ET)','Subject','Activity','Where','Right','Questions','Percent','Right on first try','Right with help','Minutes','Stars earned','Stars paid?','Review round?','Math level'];
  const rows=sessions.filter(s=>dayKey(s.ts).startsWith(month)).map(s=>{
    const d=dayKey(s.ts),i=info(s),wk=keyAdd(d,-((dow(d)+6)%7));
    return[d,['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow(d)],wk,timeOf(s.ts),i.subject,i.activity,s.home||'',s.correct,s.total,s.total?Math.round(100*s.correct/s.total):0,i.clean,i.helped,Math.max(1,Math.round((s.secs||0)/60)),s.stars||0,s.stars>0?'Yes':'Practice only',i.review?'Yes':'',i.level];
  });
  return[head,...rows].map(r=>r.map(csvCell).join(',')).join('\n');
}
/* spaced review, the same schedule as the app: 1, 3, 7, 14 and 30 days; five clean answers in a row finish an item */
const GAPS=[1,3,7,14,30];
function reviewDue(sessions,today){
  const out={spelling:0,spanish:0,geography:0,mathSkills:[]},by={spell:{},es:{},geo:{},math:{}};
  sessions.slice().sort((a,b)=>b.ts-a.ts).forEach(s=>{
    const sub=subjOf(s);if(!by[sub])return;
    (s.items||[]).forEach(i=>{const k=sub==='math'?i.t:i.w;if(!k||(sub==='geo'&&String(k).startsWith('fl')))return;(by[sub][k]||(by[sub][k]=[])).push({day:dayKey(s.ts),clean:!!i.ok&&!i.h})});
  });
  const due=ev=>{let streak=0;for(const a of ev){if(a.clean)streak++;else break}if(streak>=5||!ev.slice(0,10).some(a=>!a.clean))return false;return keyAdd(ev[0].day,GAPS[Math.min(streak,4)])<=today};
  out.spelling=Object.values(by.spell).filter(due).length;out.spanish=Object.values(by.es).filter(due).length;out.geography=Object.values(by.geo).filter(due).length;
  out.mathSkills=Object.entries(by.math).filter(([,ev])=>due(ev)).map(([t])=>TN[t]||t);
  return out;
}
function report(sessions,today,profile){
  const mon=keyAdd(today,-((dow(today)+6)%7)),sun=keyAdd(mon,6),prev=keyAdd(mon,-7);
  const inW=(s,a,b)=>{const d=dayKey(s.ts);return d>=a&&d<=b};
  const wk=sessions.filter(s=>inW(s,mon,sun)),pw=sessions.filter(s=>inW(s,prev,keyAdd(mon,-1)));
  const by={};wk.forEach(s=>{const i=info(s),o=by[i.subject]||(by[i.subject]={sessions:0,minutes:0,stars:0,right:0,total:0,clean:0});o.sessions++;o.minutes+=Math.max(1,Math.round((s.secs||0)/60));o.stars+=s.stars||0;o.right+=s.correct;o.total+=s.total;o.clean+=i.clean});
  const days=new Set(wk.map(s=>dayKey(s.ts)));
  const all=new Set(sessions.filter(s=>s.mode!=='nfl').map(s=>dayKey(s.ts)));
  let streak=0,k=today;if(!all.has(k))k=keyAdd(k,-1);while(all.has(k)){streak++;k=keyAdd(k,-1)}
  /* mastery is proven on an official test: the newest test answer for a word or state must be right */
  const tests={};
  sessions.forEach(s=>{const sub=subjOf(s);if(!['spell','es','geo'].includes(sub))return;(s.items||[]).forEach(i=>{if(!i.w||!(i.g==='test'||i.g==='gtest'))return;(tests[sub+':'+i.w]||(tests[sub+':'+i.w]=[])).push({day:dayKey(s.ts),ok:!!i.ok})})});
  const mastered=cut=>new Set(Object.entries(tests).filter(([,e])=>{const x=e.filter(a=>a.day<=cut);return x.length&&x[x.length-1].ok}).map(([k])=>k));
  const nowM=mastered(today),beforeM=mastered(keyAdd(mon,-1));
  const newlyMastered=[...nowM].filter(k=>!beforeM.has(k)).map(k=>k.replace(/^[a-z]+:/,'').replace(/^[a-z0-9]+\./,''));
  const wordEv={};
  sessions.forEach(s=>{if(subjOf(s)!=='spell')return;(s.items||[]).forEach(i=>{if(i.w)(wordEv[i.w]||(wordEv[i.w]=[])).push(!!i.ok&&!i.h)})});
  const tricky=Object.entries(wordEv).filter(([,e])=>e.length>=2&&e.slice(-3).filter(x=>!x).length>=2).map(([w])=>w);
  /* math levels, the same rule as the app: the last 8 answers for each skill */
  const mathAtt={};
  sessions.slice().sort((a,b)=>b.ts-a.ts).forEach(s=>{if(subjOf(s)!=='math')return;(s.items||[]).forEach(i=>{if(i.t)(mathAtt[i.t]||(mathAtt[i.t]=[])).push(i.ok?(i.h?.5:1):0)})});
  const mathLevels=Object.entries(mathAtt).map(([t,a])=>{a=a.slice(0,8);const sc=a.reduce((n,x)=>n+x,0)/a.length;const lv=a.length<4?2:(a.length>=6&&sc>=.85?3:sc<.5?1:2);return{skill:TN[t]||t,level:lv,tries:a.length}});
  const thu=wk.filter(s=>subjOf(s)==='es'&&dow(dayKey(s.ts))===4).length>0;
  const sum=(a,f)=>a.reduce((n,s)=>n+f(s),0);
  return{
    week:mon+' to '+sun,today,
    sessions:wk.length,previousWeekSessions:pw.length,minutes:sum(wk,s=>Math.max(1,Math.round((s.secs||0)/60))),stars:sum(wk,s=>s.stars||0),previousWeekStars:sum(pw,s=>s.stars||0),
    daysPracticed:days.size,streak,bySubject:by,spanishThursdayDone:thu,
    reviewsWaiting:reviewDue(sessions,today),
    newlyMastered,trickyWords:tricky.slice(0,12),mathLevels,
    practiceRounds:wk.filter(s=>!(s.stars>0)).length,
    totalSessionsEver:sessions.length,
    spellingList:{schoolListAdded:Array.isArray(profile.lists)&&profile.lists.length>0,wizardingWordsStart:'2026-11-04',started:today>='2026-11-04'}
  };
}
(async()=>{
  const [cmd,key,arg]=process.argv.slice(2);
  if(!key){console.error('FAILED missing the family key');process.exit(1)}
  const local=key.startsWith('file:');/* file:PATH reads a saved list of sessions instead of the network (used for testing) */
  const sessions=local?JSON.parse(require('fs').readFileSync(key.slice(5),'utf8')).sort((a,b)=>a.ts-b.ts):fetchAll(key);
  if(cmd==='csv')console.log(csv(sessions,arg));
  else if(cmd==='months')console.log([...new Set(sessions.map(s=>dayKey(s.ts).slice(0,7)))].join('\n'));
  else console.log(JSON.stringify(report(sessions,arg||dayKey(Date.now()),local?{}:fetchProfile(key)),null,1));
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
