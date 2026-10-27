// Run: node scripts/abi.test.mjs   (needs Node >= 22.6 type stripping)
import assert from 'node:assert/strict';
import * as A from '../src/scripts/abi.ts';

// official KMK conversion table thresholds
const table = { 900: 1, 823: 1, 822: 1.1, 805: 1.1, 804: 1.2, 733: 1.5, 643: 2, 553: 2.5, 463: 3, 373: 3.5, 300: 4 };
for (const [e, n] of Object.entries(table)) assert.equal(A.grade(+e), n, `E=${e}`);
assert.equal(A.grade(299), null);
for (let g = 1; g <= 4.0001; g += 0.1) {
  const r = Math.round(g * 10) / 10, m = A.minTotalFor(r);
  assert.equal(A.grade(m), r, `minTotalFor ${r}`);
  if (m > 300) assert.notEqual(A.grade(m - 1), r, `minTotalFor ${r} is lowest`);
}
assert.deepEqual(A.nextStep(642), { grade: 2, need: 1 });
assert.equal(A.nextStep(823), null);

// Block I: all 10 points, 2 LK + 8 GK → 400; LK double weight
const s = A.fresh();
s.subjects.forEach((x) => (x.hj = [10, 10, 10, 10]));
assert.equal(A.blockI(s).points, 400);
s.subjects[0].hj = [15, 15, 15, 15]; // P = 15*8 + 10*40 = 520, S = 48 → 433.33
assert.equal(A.blockI(s).points, 433);
// round half up: P/S*40 = x.5
const h = { subjects: [A.newSubject({ hj: [1, 0, null, null] })], exams: [], examCount: 5 };
assert.equal(A.blockI(h).points, 20); // 0.5*40 = 20 exact
const h2 = { subjects: [A.newSubject({ hj: [1, 1, 1, 0] }), A.newSubject({ hj: [0, 0, 0, 0] }), A.newSubject({ hj: [0, 0, 0, 0] }), A.newSubject({ hj: [0, 0, 0, 0] }), A.newSubject({ hj: [0, 0, 0, 0] })], exams: [], examCount: 5 };
assert.equal(A.blockI(h2).points, 6); // 3/20*40 = 6
const h3 = { subjects: [A.newSubject({ hj: [1, 0, 0, 0] }), ...Array.from({ length: 15 }, () => A.newSubject({ hj: [0, 0, 0, 0] }))], exams: [], examCount: 5 };
assert.equal(A.blockI(h3).points, 1); // 1/64*40 = 0.625 → 1
// blanks ignored
const p = A.fresh(); p.subjects[2].hj = [12, null, 9, null];
assert.equal(A.blockI(p).n, 2); assert.equal(A.blockI(p).points, Math.round(21 / 2 * 40));

// Block II
s.exams.forEach((e) => (e.p = 10));
assert.equal(A.blockII(s).points, 200);
s.examCount = 4; assert.equal(A.blockII(s).points, 200);
s.exams[0].p = 15; assert.equal(A.blockII(s).points, 225);
s.examCount = 5;

// full result + checks
let r = A.result(s);
assert.equal(r.total, 433 + 4 * (15 + 40)); assert.equal(r.passed, true);
s.exams.forEach((e, i) => (e.p = i < 2 ? 4 : 5)); // LKs failed
r = A.result(s); assert.equal(r.checks.find((c) => c.id === 'p5').ok, false); assert.equal(r.passed, false);
s.subjects.slice(2).forEach((x) => (x.hj = [4, 4, 4, 4])); // 32 of 40 under 5
r = A.result(s); assert.equal(r.checks.find((c) => c.id === 'u5').ok, false);
s.subjects[3].hj[0] = 0; assert.equal(A.result(s).checks.find((c) => c.id === 'z').ok, false);
const part = A.fresh(); part.subjects[0].hj = [10, 10, 10, 10]; part.exams[0].p = 12;
assert.equal(A.result(part).total, null); assert.equal(A.result(part).grade, null);
assert.equal(A.result(A.fresh()).passed, null); assert.equal(A.result(A.fresh()).total, null);

// points / sanitize
assert.equal(A.points('15'), 15); assert.equal(A.points('16'), null); assert.equal(A.points('7.5'), null); assert.equal(A.points(''), null); assert.equal(A.points('0'), 0);
const m = A.sanitize({ examCount: 4, subjects: [{ name: 'Mathe', lk: 1, hj: [12, '99', 'x'] }], exams: [{ p: 11, lk: true }] });
assert.deepEqual(m.subjects[0].hj, [12, null, null, null]); assert.equal(m.subjects[0].lk, true);
assert.equal(m.examCount, 4); assert.equal(m.exams.length, 5); assert.equal(m.exams[0].p, 11);
assert.equal(A.sanitize(null), null); assert.equal(A.sanitize({ subjects: [], exams: [] }), null);
assert.equal(A.de(1.7), '1,7');
console.log('abi sanity checks passed');
