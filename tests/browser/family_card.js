const R=window.RESULT;R.fail=[];S.home='iPad';S.settings.pin='1234';S.view='parent';S.unlocked=true;S.tab='settings';render();
R.hasCard=!!document.getElementById('famcard');R.hasInput=!!document.getElementById('linkIn');R.sync=S.sync;
R.csvS=csvSessions().split('\n')[0];R.csvI=csvItems().split('\n')[0];
R.famUrlOk=FAM?/#k=/.test(famUrl()):null;
R.pill=document.querySelector('.navbar .pill').textContent;
if(!R.hasCard)R.fail.push('no family card');
