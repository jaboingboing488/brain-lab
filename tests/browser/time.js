const R=window.RESULT;
const a=Date.parse('2026-12-17T23:30:00-05:00'), b=Date.parse('2026-12-18T00:30:00-05:00');
R.dayA=dayKey(a);R.dayB=dayKey(b);R.sameDay=dayNo(a)===dayNo(b);
R.thu=isThu(Date.parse('2026-12-17T12:00:00-05:00'));
R.bday=isBday();R.now=etNow().toString();
R.fail=[];if(R.dayA!=='2026-12-17')R.fail.push('dayA');if(R.sameDay)R.fail.push('sameday');if(!R.thu)R.fail.push('thu');if(!R.bday)R.fail.push('bday');
