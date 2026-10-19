const R=window.RESULT;R.fail=[];
/* This test runs WITHOUT the harness's own switch (window.__NODB is unset), with a family key present.
   The page must still refuse to connect to the real data, because it is running in an automated browser. */
R.nodbSet=!!window.__NODB;R.famLinked=!!FAM;
await initDb();
await new Promise(r=>setTimeout(r,500));
R.db=!!db;R.sync=S.sync;
if(R.nodbSet)R.fail.push('harness switch should be off for this test');
if(!R.famLinked)R.fail.push('this test needs a linked family key');
if(R.db)R.fail.push('a test browser connected to the real data');
if(S.sync==='live')R.fail.push('sync reported live in a test browser');
