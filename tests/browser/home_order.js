const R=window.RESULT;R.fail=[];S.home='iPad';S.view='home';render();
/* the daily affirmation sits directly beneath Today's Mission */
const kids=[...document.querySelectorAll('#app > *')];
const i=kids.findIndex(e=>e.classList.contains('playbook')),j=kids.findIndex(e=>e.classList.contains('affirm'));
R.mission=i;R.affirm=j;
if(i<0||j<0)R.fail.push('missing mission or affirmation');
else if(j!==i+1)R.fail.push('affirmation is not directly under the mission card (positions '+i+' and '+j+')');
