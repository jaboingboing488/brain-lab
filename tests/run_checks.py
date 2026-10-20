"""Run every check. Usage: python tests/run_checks.py
Needs Python 3, Node 18+ and Google Chrome. Exit code 1 if anything fails."""
import os, subprocess, sys, json, re, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
fails = []

def say(ok, name, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name + (' - ' + extra if extra else ''))
    if not ok: fails.append(name)

# ---- static checks ----
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
tmp = os.path.join(tempfile.gettempdir(), 'bl_syntax.js'); open(tmp, 'w', encoding='utf-8').write(scripts[0])
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
say(r.returncode == 0, 'script syntax', r.stderr[:300])
say('Content-Security-Policy' in html, 'content security policy present')
say(len(html) < 2000000, 'page size under 2 MB', str(len(html)))
say(not re.search(r'birth\w*\W{0,12}2015|2015\W{0,12}birth|December 17, 2015', html), 'no birth year in the public code')
rules = open(os.path.join(ROOT, 'firestore.rules'), encoding='utf-8').read()
say('__FAMILY_KEY__' in rules and not re.search(r'/fam/[A-Za-z0-9]{20,}', rules), 'rules file holds the placeholder, not the secret')
say(not re.search(r'#k=[A-Za-z0-9]{20,}', html), 'no family link in the page')
mf = json.load(open(os.path.join(ROOT, 'manifest.webmanifest'), encoding='utf-8'))
say(all(os.path.exists(os.path.join(ROOT, i['src'])) for i in mf['icons']), 'manifest icons exist')
r = subprocess.run(['node', os.path.join(HERE, 'generator.test.js')], capture_output=True, text=True)
say(r.returncode == 0, 'question generator', (r.stdout[-200:] if r.returncode else ''))

# ---- browser checks: each file runs inside the real page ----
H = os.path.join(HERE, 'harness.py'); B = os.path.join(HERE, 'browser'); S = os.path.join(HERE, 'seeds')
NOW = '2026-10-20T12:00:00-04:00'
runs = [
  ('time zone and day rollover', 'time.js', ['--now', '2026-12-17T21:00:00-05:00']),
  ('holiday countdowns', 'holidays.js', ['--now', '2026-10-18T12:00:00-04:00']),
  ('scoring, one a day, hints, review, levels', 'scoring_review_levels.js', ['--now', NOW]),
  ('sync merge, saved history, migration', 'sync_merge.js', ['--now', NOW, '--seed', os.path.join(S, 'linked.json')]),
  ('what you learned', 'learned.js', ['--now', NOW]),
  ('read aloud', 'audio.js', ['--now', NOW]),
  ('prizes, birthday, kicks, rules shape', 'misc.js', ['--now', NOW]),
  ('home order: affirmation under the mission card', 'home_order.js', ['--now', NOW]),
  ('family card', 'family_card.js', ['--now', NOW]),
  ('test browsers can never reach the real data', 'live_guard.js', ['--now', NOW, '--seed', os.path.join(S, 'linked.json'), '--live-guard-test']),
  ('wizard list: before November 4', 'wizard_list.js', ['--now', '2026-11-03T12:00:00-05:00']),
  ('wizard list: November 4', 'wizard_list.js', ['--now', '2026-11-04T08:00:00-05:00']),
  ('wizard list: school list added', 'wizard_list.js', ['--now', '2026-11-04T08:00:00-05:00', '--seed', os.path.join(S, 'school_list.json')]),
  ('no sideways scrolling, 360 px phone', 'overflow.js', ['--now', NOW, '--size', '520x900', '--frame', '360x740']),
  ('no sideways scrolling, 320 px phone', 'overflow.js', ['--now', NOW, '--size', '520x900', '--frame', '320x640']),
  ('no sideways scrolling, 820 px iPad', 'overflow.js', ['--now', NOW, '--size', '900x1000', '--frame', '820x1000']),
]
for name, f, args in runs:
    p = subprocess.run([sys.executable, H, os.path.join(B, f)] + args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    say(p.returncode == 0, name, '' if p.returncode == 0 else (p.stdout[-600:] + p.stderr[-200:]).replace('\n', ' '))

print('\n%d failed' % len(fails) if fails else '\nall checks passed')
sys.exit(1 if fails else 0)
