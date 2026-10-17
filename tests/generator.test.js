// Run with: node tests/generator.test.js
// Pulls the question generator out of index.html (between GEN-START / GEN-END) and checks it.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = html.split('/*GEN-START*/')[1].split('/*GEN-END*/')[0];
// the generator uses the page's own pick/shuffle helpers, so load those lines too
const helpers = html.split('\n').filter(l => /^const (ri|pick|shuffle)=/.test(l)).join('\n');
const G = vm.runInNewContext(helpers + '\n' + block + '\n({makeQuestion, SKILLS, SKILL_ORDER, examSkills, numberToWords, divSteps, fmt, BLUEPRINT})');

const N = 3000;
let fails = 0, checked = 0;
const fail = (skill, msg, q) => { fails++; if (fails <= 25) console.log('FAIL', skill, msg, JSON.stringify(q && { text: q.text, ans: q.ans, choices: q.choices })); };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const parse = s => Number(String(s).replace(/,/g, ''));
const sorted = a => a.slice().sort((x, y) => x - y);

// independent answer checks, built only from q.meta (or the question text)
const independent = {
  words(q) { // read the words back into a number
    const W = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
    const words = q.text.match(/“(.*)”/)[1].replace(/-/g, ' ').split(' ');
    let total = 0, cur = 0;
    for (const w of words) { if (w === 'hundred') cur *= 100; else if (w === 'thousand') { total += cur * 1000; cur = 0; } else cur += W[w]; }
    return String((total + cur).toLocaleString('en-US'));
  },
  mul_round(q) { const [a, b] = q.text.split('=')[0].split('×').map(parse); return (a * b).toLocaleString('en-US'); },
  mul_multi(q) { const [a, b] = q.text.split('=')[0].split('×').map(parse); return (a * b).toLocaleString('en-US'); },
  divword(q) { const { dv, d } = q.meta; return String(Math.floor(dv / d)); },
  divrem(q) { const m = q.text.match(/^([\d,]+) ÷ (\d+)/); const dv = parse(m[1]), d = Number(m[2]); return `${Math.floor(dv / d)} R ${dv % d}`; },
  mode(q) { const arr = q.text.split(': ')[1].split(', ').map(Number); const c = {}; arr.forEach(v => c[v] = (c[v] || 0) + 1); const mx = Math.max(...Object.values(c)); const top = Object.keys(c).filter(k => c[k] === mx); if (top.length !== 1) throw new Error('not a unique mode'); return top[0]; },
  mean(q) { const arr = q.text.split(': ')[1].split(', ').map(Number); const s = arr.reduce((a, b) => a + b, 0); if (s % arr.length) throw new Error('mean not whole'); return String(s / arr.length); },
  median(q) { const arr = sorted(q.text.split(': ')[1].split(', ').map(Number)); const n = arr.length; const v = n % 2 ? arr[(n - 1) / 2] : (arr[n / 2 - 1] + arr[n / 2]) / 2; if (!Number.isInteger(v)) throw new Error('median not whole'); return String(v); },
  range(q) { const arr = q.text.split(': ')[1].split(', ').map(Number); return String(Math.max(...arr) - Math.min(...arr)); },
  addfrac(q) { const m = q.text.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/).slice(1).map(Number); const [a, b, c, d] = m; const n = a * d + c * b, dn = b * d, g = gcd(n, dn); return `${n / g}/${dn / g}`; },
  simplify(q) { const [n, d] = q.text.match(/(\d+)\/(\d+)/).slice(1).map(Number); const g = gcd(n, d); return `${n / g}/${d / g}`; },
  gcf(q) { const [a, b] = q.text.match(/of (\d+) and (\d+)/).slice(1).map(Number); return String(gcd(a, b)); },
  lcm(q) { const [a, b] = q.text.match(/of (\d+) and (\d+)/).slice(1).map(Number); return String(a * b / gcd(a, b)); },
  factors(q) { const n = Number(q.text.match(/does (\d+) have/)[1]); let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return String(c); }
};

// skill-specific rules that prove the skill is actually exercised
const rules = {
  words(q) { return q.meta.n >= 10000 && q.meta.n < 1000000 && q.meta.r > 0; },
  mul_round(q) { return q.meta.A % 1000 === 0 && q.meta.B % 100 === 0 && q.meta.A >= 2000 && q.meta.B >= 200; },
  mul_multi(q) { return q.meta.m >= 12 && q.meta.m % 10 !== 0 && q.meta.n >= 100; },
  divword(q) { return q.meta.dv >= 100 && q.meta.d >= 9 && q.meta.q >= 12 && (q.meta.full ? q.meta.r > 0 : q.meta.r === 0) && q.meta.dv === q.meta.q * q.meta.d + q.meta.r; },
  divrem(q) { const m = q.meta; return m.r > 0 && m.r < m.d && m.dv === m.q * m.d + m.r && m.dv >= 100; },
  mode(q) { return q.meta.list.length >= 7; },
  mean(q) { return q.meta.arr.length >= 4; },
  median(q) { return q.meta.arr.length >= 4; },
  range(q) { return Math.max(...q.meta.arr) - Math.min(...q.meta.arr) >= 10; },
  addfrac(q) { const { b, d } = q.meta; return b !== d; },
  simplify(q) { const { n, d } = q.meta; return gcd(n, d) > 1; },
  gcf(q) { return gcd(q.meta.a, q.meta.b) >= 2; },
  lcm(q) { const { a, b } = q.meta; return a % b !== 0 && b % a !== 0; },
  factors(q) { return q.meta.N >= 12; }
};

for (const skill of G.SKILL_ORDER) {
  for (let i = 0; i < N; i++) {
    let q;
    try { q = G.makeQuestion(skill); } catch (e) { fail(skill, 'threw ' + e.message); continue; }
    checked++;
    // exactly 4 unique choices, exactly 1 correct, equal to the independent answer
    const texts = q.choices.map(c => c.t);
    if (q.choices.length !== 4) fail(skill, 'not 4 choices', q);
    if (new Set(texts).size !== 4) fail(skill, 'duplicate choices', q);
    if (q.choices.filter(c => c.ok).length !== 1) fail(skill, 'not exactly one correct', q);
    const okChoice = q.choices.find(c => c.ok);
    if (okChoice.t !== q.ans) fail(skill, 'ok choice != ans', q);
    let want;
    try { want = independent[skill](q); } catch (e) { fail(skill, 'independent check threw: ' + e.message, q); continue; }
    if (want !== q.ans) fail(skill, `answer ${q.ans} != independent ${want}`, q);
    // every wrong choice has a mistake label, and none look broken
    for (const c of q.choices) {
      if (!c.ok && !c.m) fail(skill, 'wrong choice without a mistake label', q);
      if (/NaN|undefined|Infinity|^-/.test(c.t)) fail(skill, 'broken choice text ' + c.t, q);
    }
    // steps: end on the right answer, hints never give it away
    const last = q.steps[q.steps.length - 1];
    if (!last.includes(q.ans)) fail(skill, 'last step does not contain the answer', q);
    if (q.steps.length < 3) fail(skill, 'too few steps', q);
    if (q.hints.length !== q.steps.length - 1) fail(skill, 'hints != steps-1', q);
    if (!rules[skill](q)) fail(skill, 'skill rule violated ' + JSON.stringify(q.meta).slice(0, 120), q);
  }
}

// long-division step helper: quotient and remainder are right
for (let i = 0; i < 5000; i++) {
  const d = 3 + Math.floor(Math.random() * 40), dv = 100 + Math.floor(Math.random() * 9899);
  const r = G.divSteps(dv, d);
  if (r.q !== Math.floor(dv / d) || r.r !== dv % d) fail('divSteps', `${dv}/${d} -> ${r.q} R ${r.r}`);
}
// number words: spot checks
const spot = [[152557, 'one hundred fifty-two thousand five hundred fifty-seven'], [300005, 'three hundred thousand five'], [40100, 'forty thousand one hundred'], [999999, 'nine hundred ninety-nine thousand nine hundred ninety-nine'], [110011, 'one hundred ten thousand eleven']];
for (const [n, w] of spot) if (G.numberToWords(n) !== w) fail('words', `${n} -> ${G.numberToWords(n)}`);
// exam blueprint
const ex = G.examSkills(20);
if (ex.length !== 20 || ex.some(s => !G.SKILLS[s])) fail('exam', 'bad blueprint');
for (const k of ['mode', 'mean', 'median', 'range', 'divrem', 'divword', 'words', 'mul_round', 'mul_multi']) if (!ex.includes(k)) fail('exam', 'blueprint missing ' + k);

console.log(`${checked} questions across ${G.SKILL_ORDER.length} skills checked; ${fails} failure(s).`);
process.exit(fails ? 1 : 0);
