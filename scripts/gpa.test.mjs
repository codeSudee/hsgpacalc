// Run: node scripts/gpa.test.mjs   (needs Node >= 22.6 type stripping)
import assert from 'node:assert/strict';
import * as G from '../src/scripts/gpa.ts';

const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);
const mk = (grade, level = 'reg', credits = 1, extra = {}) => G.newClass({ grade, level, credits, ...extra });
const st = (classes, o = {}) => ({ ...G.fresh(), years: [{ id: 'y', name: '9th', classes }], ...o });
const U = (s) => { const t = G.cumulative(s); return G.gpa(t.qu, t.cr); };
const W = (s) => { const t = G.cumulative(s); return G.gpa(t.qw, t.cr); };

// basics, defaults +0.5 / +1.0
let s = st([mk('A'), mk('B', 'hon'), mk('B', 'ap')]);
near(U(s), 10 / 3, 'unweighted'); near(W(s), (4 + 3.5 + 4) / 3, 'weighted');
// custom bonuses
s = { ...s, honors: 0.25, ap: 2 };
near(W(s), (4 + 3.25 + 5) / 3, 'custom bonus');
// F gets no bonus; excluded / blank / zero-credit ignored
s = st([mk('F', 'ap'), mk('A', 'reg', 1, { exclude: true }), mk(''), mk('A', 'reg', 0)]);
near(W(s), 0, 'F no bonus'); assert.equal(G.totals(s, s.years[0].classes).n, 1);
assert.equal(U(st([])), null);
// credits weighting
near(U(st([mk('A', 'reg', 3), mk('C', 'reg', 1)])), 3.5, 'credit weights');
// scales
near(U(st([mk('A+')], { scale: 'p433' })), 4.33, 'A+ 4.33');
near(U(st([mk('A+')])), 4, 'A+ plus');
near(U(st([mk('A-')], { scale: 'p433' })), 3.67, 'A- 4.33');
near(U(st([mk('B-')], { scale: 'plain' })), 3, 'plain');
near(G.maxWeighted({ scale: 'p433', honors: 0.5, ap: 1 }), 5.33, 'max weighted');
// prior GPA
s = st([mk('A', 'reg', 2)], { priorU: '3', priorCr: '6' });
near(U(s), (8 + 18) / 8, 'prior U'); near(W(s), (8 + 18) / 8, 'prior W defaults to U');
s = { ...s, priorW: '3.6' }; near(W(s), (8 + 21.6) / 8, 'prior W');
assert.equal(G.prior({ ...s, priorCr: '0' }), null); assert.equal(G.prior({ ...s, priorU: 'abc' }), null);
near(U({ ...s, priorU: '' }), 4, 'blank prior ignored');
// sanitize / migration of legacy save (no new fields)
const legacy = { scale: 'plain', target: '3.5', tCredits: '4', tType: 'w', years: [{ id: 'a', name: 'X', classes: [{ id: 'b', name: 'n', level: 'ap', grade: 'B', credits: 1, exclude: false }] }] };
const m = G.sanitize(legacy);
assert.equal(m.honors, 0.5); assert.equal(m.ap, 1); assert.equal(m.scale, 'plain'); assert.equal(m.priorU, '');
assert.equal(G.sanitize(null), null); assert.equal(G.sanitize({ years: [] }), null);
assert.equal(G.sanitize({ ...legacy, honors: 99, ap: -3 }).honors, 2); assert.equal(G.sanitize({ ...legacy, ap: -3 }).ap, 0);
assert.equal(G.sanitize({ ...legacy, honors: 'x' }).honors, 0.5);
assert.equal(G.sanitize({ ...legacy, scale: 'bogus' }).scale, 'plus');
assert.equal(G.sanitize({ ...legacy, years: [{ classes: [{ grade: 'Z', credits: 99 }] }] }).years[0].classes[0].grade, '');
// share round trip incl. unicode
s = st([mk('A-', 'hon', 0.5, { name: 'Español "II", ñ' }), mk('B+', 'ap', 1, { exclude: true })], { scale: 'p433', honors: 0.75, ap: 1.5, priorU: '3.2', priorCr: '8', target: '3.8' });
const r = G.decodeShare(G.encodeShare(s));
assert.deepEqual(JSON.parse(JSON.stringify({ ...r, years: r.years.map((y) => ({ ...y, id: '', classes: y.classes.map((c) => ({ ...c, id: '' })) })) })),
  JSON.parse(JSON.stringify({ ...s, years: s.years.map((y) => ({ ...y, id: '', classes: y.classes.map((c) => ({ ...c, id: '' })) })) })));
assert.equal(G.decodeShare('!!!notbase64'), null); assert.equal(G.decodeShare(btoa('{"v":2}')), null);
// csv
const csv = G.toCsv(st([mk('A', 'hon', 1, { name: '=HYPERLINK("x")' }), mk('B', 'reg', 1, { name: 'Math, Adv' })]));
assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); assert.ok(csv.includes('"Math, Adv"')); assert.ok(csv.includes('Cumulative GPA'));
// letterFor
assert.equal(G.letterFor('plus', 3.7), 'A-'); assert.equal(G.letterFor('p433', 3.33), 'B+');
console.log('gpa sanity checks passed');
