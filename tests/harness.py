"""Run a JavaScript test inside the real page in headless Chrome.
usage: python tests/harness.py TEST.js [--now 2026-12-17T15:00:00-05:00] [--seed seed.json] [--size 500x900] [--shot out.png] [--html index.html]
The test file runs after the page loads. It sets window.RESULT (any JSON) and can use every global in the page.
Prints the JSON result. Exit code 1 if the page throws or RESULT.fail is non-empty."""
import sys, os, re, json, subprocess, tempfile, shutil, argparse, datetime

def find_chrome():
    for c in [os.environ.get('CHROME'), r'C:\Program Files\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
              shutil.which('google-chrome'), shutil.which('chromium'), shutil.which('chromium-browser'), shutil.which('chrome')]:
        if c and os.path.exists(c): return c
    raise SystemExit('Chrome not found. Set CHROME to its path.')

ap = argparse.ArgumentParser()
ap.add_argument('test'); ap.add_argument('--now'); ap.add_argument('--seed'); ap.add_argument('--size', default='500x900')
ap.add_argument('--shot'); ap.add_argument('--html', default=os.path.join(os.path.dirname(__file__), '..', 'index.html'))
ap.add_argument('--wait', type=int, default=900)
a = ap.parse_args()
html = open(a.html, encoding='utf-8').read()
pre = ['window.__NODB=1;']  # tests never reach the live sync service
if a.now:
    ms = int(datetime.datetime.fromisoformat(a.now).timestamp() * 1000)
    pre.append('window.__NOW=%d;' % ms)
if a.seed:
    pre.append('try{var __s=%s;for(var k in __s)localStorage.setItem(k,JSON.stringify(__s[k]))}catch(e){}' % open(a.seed, encoding='utf-8').read())
pre.append('window.__ERR=[];window.addEventListener("error",function(e){window.__ERR.push(String(e.message))});')
test = open(a.test, encoding='utf-8').read()
post = ('<script>setTimeout(async function(){try{window.RESULT={};' + test +
        '\n}catch(e){window.RESULT={fail:["THROW "+e.message+" "+String(e.stack||"").slice(0,240)]}}'
        'document.body.setAttribute("data-zzres",JSON.stringify({r:window.RESULT,err:window.__ERR}))},%d)</script>' % a.wait)
i = html.index('<script>')
html = html[:i] + '<script>' + ''.join(pre) + '</script>' + html[i:]
j = html.rindex('</body>')
html = html[:j] + post + html[j:]
d = tempfile.mkdtemp(prefix='blt')
f = os.path.join(d, 't.html'); open(f, 'w', encoding='utf-8').write(html)
w, h = a.size.split('x')
cmd = [find_chrome(), '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--window-size=%s,%s' % (w, h),
       '--user-data-dir=' + os.path.join(d, 'prof'), '--virtual-time-budget=6000']
if a.shot: cmd.append('--screenshot=' + os.path.abspath(a.shot))
else: cmd.append('--dump-dom')
cmd.append('file:///' + f.replace(chr(92), '/'))
p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
if a.shot:
    print('screenshot', a.shot); shutil.rmtree(d, ignore_errors=True); sys.exit(0)
m = re.search(r'data-zzres="([^"]*)"', p.stdout)
shutil.rmtree(d, ignore_errors=True)
if not m: print('NO RESULT', p.stderr[-400:]); sys.exit(1)
import html as H
res = json.loads(H.unescape(m.group(1)))
print(json.dumps(res['r'], indent=1)[:6000])
if res['err']: print('PAGE ERRORS:', res['err'])
bad = bool(res['err']) or bool((res['r'] or {}).get('fail'))
sys.exit(1 if bad else 0)
