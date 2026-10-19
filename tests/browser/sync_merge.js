const R=window.RESULT;R.fail=[];
const DAY=86400000,now=nowMs();
const mem={sess:new Map(),meta:new Map()};
IDB.all=async()=>[...mem.sess.values()];IDB.put=async l=>{l.forEach(x=>mem.sess.set(x.id,x))};IDB.getMeta=async k=>mem.meta.get(k);IDB.setMeta=async(k,v)=>{mem.meta.set(k,v)};
// ----- fake cloud -----
const cloud={sessions:[],profile:null,oldSessions:[{id:'old1',ts:now-3*DAY,mode:'spell',home:'x',correct:1,total:1,secs:5,stars:3,items:[{t:'sp',g:'cards',w:'knee',ok:1,h:0}]}],oldProfile:null,saved:[],sinceCalls:[],profileWrites:0};
const mkDoc=(id,data)=>({id,data:()=>data});
loadFirestore=async()=>({
  since:(ts,ok)=>{cloud.sinceCalls.push(ts);setTimeout(()=>ok({docs:cloud.sessions.filter(s=>s.ts>=ts).map(s=>mkDoc(s.id,(({id,...r})=>r)(s)))}),10)},
  save:async s=>{cloud.saved.push(s.id);cloud.sessions.push(s)},
  profile:(ok)=>{setTimeout(()=>ok({exists:()=>!!cloud.profile,data:()=>cloud.profile}),10)},
  saveProfile:async p=>{cloud.profile=JSON.parse(JSON.stringify(p));cloud.profileWrites++},
  oldSessions:async()=>({docs:cloud.oldSessions.map(s=>mkDoc(s.id,(({id,...r})=>r)(s)))}),
  oldProfile:async()=>({exists:()=>!!cloud.oldProfile,data:()=>cloud.oldProfile})
});
R.famLoaded=!!FAM;
// ----- merge rules -----
store.set('bl.avatar',{skin:4,room:{wall:'sky',sheets:'black'}});store.set('bl.rt',{'r.wall':2000,'r.sheets':2000,'a.skin':2000});store.set('bl.profileTs',2000);
store.set('bl.snap',flatProfile());
const remote={avatar:{skin:1,hair:3,room:{wall:'sand',sheets:'gold',critters:['trex']}},topics:['num'],splist:'ie',lists:[{id:'c1',name:'A',words:['aaa','bbb','ccc']}],updated:3000,rt:{'r.wall':3000,'r.sheets':1000,'a.skin':1500,'a.hair':2500,topics:2500,splist:100},kicks:2,by:[2026],del:[],birth:2015};
const ch=mergeProfile(remote);const a=getAv();
R.merged={ch,wall:a.room.wall,sheets:a.room.sheets,skin:a.skin,hair:a.hair,critters:a.room.critters,topics:S.topics,splist:S.splist,lists:customLists().length,kicks:store.get('bl.kicks',0),by:store.get('bl.by',[])};
if(a.room.wall!=='sand')R.fail.push('remote newer wall should win');
if(a.room.sheets!=='black')R.fail.push('local newer sheets should win');
if(a.skin!==4)R.fail.push('local newer skin');
if(a.hair!==3)R.fail.push('remote newer hair');
if(!a.room.critters.includes('trex'))R.fail.push('critters union');
if(S.topics.join()!=='num')R.fail.push('topics');
if(customLists().length!==1||store.get('bl.kicks',0)!==2)R.fail.push('lists/kicks');
// a second merge of the same data changes nothing
R.again=mergeProfile(remote);if(R.again)R.fail.push('merge not idempotent');
// deletion beats the other home's old copy
store.set('bl.del',['c1']);store.set('bl.lists',[]);R.delMerge=mergeProfile(remote);R.listsAfterDel=customLists().length;if(R.listsAfterDel!==0)R.fail.push('deleted list came back');
// profile pushed to the cloud is stable (does not loop)
const pd=profileData();R.pdKeys=Object.keys(pd).join();
if(!pd.rt||typeof pd.updated!=='number')R.fail.push('profileData shape');
// ----- full flow: cache, delta read, migration -----
const old=Date.now()-40*DAY;
cloud.sessions=[{id:'n1',ts:now-1*DAY,mode:'smart',home:'x',correct:1,total:1,secs:5,stars:3,items:[{t:'mean',ok:1,h:0}]},{id:'n2',ts:now-30*DAY,mode:'smart',home:'x',correct:1,total:1,secs:5,stars:3,items:[{t:'mean',ok:1,h:0}]}];
store.set('bl.mig',false);
await initDb();await new Promise(r=>setTimeout(r,400));
R.flow={sync:S.sync,sinceCalls:cloud.sinceCalls,sessions:S.sessions.length,saved:cloud.saved};
if(S.sync!=='live')R.fail.push('not live');
if(cloud.sinceCalls[0]!==0)R.fail.push('first load should read everything');
if(!S.sessions.some(s=>s.id==='old1')&&!cloud.saved.includes('old1'))R.fail.push('old session not migrated');
// second visit: only the last week is read
const idbAll=await IDB.all();R.idb=idbAll.length;
await IDB.setMeta('full',now);
cloud.sinceCalls=[];sessCache=new Map();dbSessions=null;
await initDb();await new Promise(r=>setTimeout(r,400));
R.second={since:cloud.sinceCalls[0],sinceAgeDays:Math.round((now-cloud.sinceCalls[0])/DAY),sessions:S.sessions.length};
if(!(cloud.sinceCalls[0]>0))R.fail.push('second visit should be a delta read');
if(S.sessions.length<R.idb)R.fail.push('history lost');
// kicks from synced data
R.kick={pending:tdPending()};
