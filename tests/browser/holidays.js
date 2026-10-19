const R=window.RESULT;R.fail=[];
const chk=(y,m,d)=>{const x=nextHoliday(new Date(y,m-1,d));return x?x.h.name+' in '+x.n:null};
R.seq={
 oct18:chk(2026,10,18),nov1:chk(2026,11,1),nov26:chk(2026,11,26),nov27:chk(2026,11,27),dec1:chk(2026,12,1),dec17:chk(2026,12,17),dec25:chk(2026,12,25),dec26:chk(2026,12,26),dec28:chk(2026,12,28),dec31:chk(2026,12,31),jan1:chk(2027,1,1),jan5:chk(2027,1,5),jan18:chk(2027,1,18),feb1:chk(2027,2,1),feb14:chk(2027,2,14),mar20:chk(2027,3,20),mar26:chk(2027,3,26),easter2027:easterDate(2027).toDateString(),mem:lastDow(2027,4,1).toDateString(),tg2027:nthDow(2027,10,4,4).toDateString()};
store.set('bl.birth',2015);
R.home=holidayHtml().slice(0,200);
R.cal=calendarHtml().length;
R.room=calArt('plain').length;
R.bdayNow=isBday();
if(R.seq.nov26!=='Thanksgiving in 0')R.fail.push('tg');
if(R.seq.easter2027!=='Sun Mar 28 2027')R.fail.push('easter '+R.seq.easter2027);
if(R.seq.tg2027!=='Thu Nov 25 2027')R.fail.push('tg27');
