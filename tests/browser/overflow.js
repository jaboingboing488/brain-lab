const R=window.RESULT;R.fail=[];R.over=[];R.w=innerWidth;
S.home='iPad';S.settings.pin='1234';
const W=innerWidth;
function audit(name){
  const bad=[];
  const sw=document.documentElement.scrollWidth;
  if(sw>W+1)bad.push('page scrollWidth '+sw);
  document.querySelectorAll('#app *').forEach(el=>{
    if(el.closest('svg'))return;
    const r=el.getBoundingClientRect();
    if(r.width>0&&(r.right>W+1||r.left<-1)){bad.push((el.className&&el.className.baseVal===undefined?'.'+String(el.className).split(' ')[0]:el.tagName)+' '+Math.round(r.left)+'-'+Math.round(r.right))}
  });
  /* text or children spilling out of their own box (what a wider font would push past the screen) */
  document.querySelectorAll('#app *').forEach(el=>{
    if(el.closest('svg')||el.tagName==='INPUT'||el.tagName==='SELECT')return;
    const o=getComputedStyle(el).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'||o==='clip')return;
    if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0)bad.push('spill '+el.tagName+'.'+String(el.className).split(' ')[0]+' '+el.scrollWidth+'>'+el.clientWidth);
  });
  if(bad.length)R.over.push(name+': '+[...new Set(bad)].slice(0,4).join('; '));
}
const go=(name,fn)=>{try{fn();render();audit(name)}catch(e){R.over.push(name+' THREW '+e.message)}};
go('home',()=>{S.view='home'});
go('math',()=>{S.view='math'});
go('spell',()=>{S.view='spell'});
go('lesson',()=>{S.view='lesson'});
go('es',()=>{S.view='es'});
go('geo',()=>{S.view='geo'});
go('room',()=>{S.view='room'});
go('closet',()=>{S.view='closet'});
go('more',()=>{S.view='more'});
go('parent-progress',()=>{S.view='parent';S.unlocked=true;S.tab='progress';S.psub='math'});
go('parent-log',()=>{S.tab='log'});
go('parent-settings',()=>{S.tab='settings'});
go('parent-spell',()=>{S.tab='progress';S.psub='spell'});
go('parent-es',()=>{S.psub='es'});
go('parent-geo',()=>{S.psub='geo'});
go('fb',()=>{S.view='fb';S.unlocked=false});
go('mathrun',()=>{start('guided');});
go('mathrun-mc',()=>{act('hint');act('hint')});
go('mathexam',()=>{start('exam');run.started=true});
for(const g of ['cards','test','sent','write','scramble','fill','hunt','spot']){go('sp-'+g,()=>{S.view='home';startSpell(g)})}
for(const g of ['gtest','wcap','wstate','map','pcap','pstate','fl']){go('geo-'+g,()=>{S.view='home';geoStart(g)})}
for(const g of ['es2en','en2es','listen','type','tiles','test']){go('es-'+g,()=>{S.view='home';esStart(g)})}
go('quiz',()=>{S.view='home';startQuiz('quiz')});
go('draft',()=>{S.view='home';startDraft()});
// results and learned screens
start('guided');let n=0;while(S.view==='run'&&n++<40){const q=run.qs[run.i];guidedSubmit(q.ans);if(run.st[run.i].done)act('next')}
go('learned',()=>{});
go('results',()=>{S.learn=null});
go('tdmodal',()=>{S.view='home';S.tdp;tdq={step:'q',kind:'fg',subj:'math',q:tdMake('fg','math')};tdDraw()});
const m=document.getElementById('tdmodal');if(m){const r=m.querySelector('.tdbox').getBoundingClientRect();if(r.right>W+1)R.over.push('tdbox '+Math.round(r.right))}
if(R.over.length)R.fail.push('overflow');
