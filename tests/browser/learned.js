const R=window.RESULT;R.fail=[];
S.home='iPad';
// math
start('guided');let n=0;while(S.view==='run'&&n++<40){const q=run.qs[run.i];if(run.i%4===0)guidedSubmit('zzz');guidedSubmit(q.ans);if(run.st[run.i].done)act('next')}
R.math={view:S.view,learn:!!S.learn,again:S.learn&&S.learn.again.length,nailed:S.learn&&S.learn.nailed.length};
render();R.mathHtml=document.querySelector('.learn')?document.querySelector('.learn h2').textContent:'NO LEARN SCREEN';
act('learncont');R.afterCont=document.querySelector('.learn')?'still':'results';
// spelling flashcards: wrong then right
S.view='home';startSpell('sent');n=0;
while(S.view==='sprun'&&n++<40){const it=sp.items[sp.i];if(it.done){act('spnext');continue}const el=document.getElementById('spin');if(!el){break}el.value=sp.i===0?'zzzz':it.w;act('spcheck');if(sp.items[sp.i].done||sp.items[sp.i].msg==='reveal'){act('spnext')}}
R.spell={view:S.view,learn:S.learn&&S.learn.sub};
render();R.spHtml=document.querySelector('.learn')?document.querySelector('.learn').innerText.slice(0,160):'NO';
// geography
S.view='home';geoStart('pcap');n=0;while(S.view==='grun'&&n++<40){const q=geo.qs[geo.i];if(geo.i===0)geoSubmit('Nope');geoSubmit(q.ans);if(geo.st[geo.i].done)act('gnext')}
R.geo={view:S.view,learn:S.learn&&S.learn.sub,again:S.learn&&S.learn.again.length};
// spanish
S.view='home';esStart('es2en');n=0;while(S.view==='esrun'&&n++<40){const q=es.qs[es.i];if(es.i===0)esSubmit('Nope');esSubmit(q.ans);if(es.st[es.i].done)act('esnext')}
R.es={view:S.view,learn:S.learn&&S.learn.sub,again:S.learn&&S.learn.again.length,txt:S.learn&&S.learn.title};
if(!R.math.learn||!R.mathHtml.includes('math'))R.fail.push('math learn');
if(R.afterCont!=='results')R.fail.push('continue');
if(R.spell.learn!=='spell'||R.geo.learn!=='geo'||R.es.learn!=='es')R.fail.push('learn per subject');
if(!R.math.again)R.fail.push('again list');
