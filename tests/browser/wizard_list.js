const R=window.RESULT;R.fail=[];
/* before November 4 the list is off; from November 4 it is on, unless a school list was added */
R.on=hpOn();R.sel=S.splist;
const schoolList=customLists().length>0,afterNov4=nowMs()>=new Date(2026,10,4).getTime();
const expectOn=afterNov4&&!schoolList;
if(R.on!==expectOn)R.fail.push('wizard list should be '+expectOn+' but is '+R.on);
if(expectOn&&R.sel!=='hp4')R.fail.push('should be selected');
R.wordsOk=HP_LESSON.words.every(w=>SENT[w]&&SENT[w].toLowerCase().includes(w));
if(!R.wordsOk)R.fail.push('every word needs a sentence that contains it');
if(HP_LESSON.words.some(w=>LESSONS.some(l=>l.words.includes(w))))R.fail.push('duplicate word');
