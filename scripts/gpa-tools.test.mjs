// Run: node scripts/gpa-tools.test.mjs   (needs Node >= 22.6 type stripping)
// Also proves every worked example printed on the guide pages.
import assert from 'node:assert/strict';
import * as G from '../src/scripts/gpa.ts';
import { PERCENT_BANDS, percentToGpa, cumulativeGpa, requiredGpa, gpaAfter } from '../src/scripts/gpa-tools.ts';

const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);
const two = (n) => n.toFixed(2);

// Bands are contiguous, descending, and every letter exists on both scales.
for (let i = 0; i < PERCENT_BANDS.length; i++) {
  const b = PERCENT_BANDS[i];
  assert.ok(b.letter in G.SCALES.plus && b.letter in G.SCALES.p433, b.letter);
  if (i) assert.ok(b.min < PERCENT_BANDS[i - 1].min, 'descending');
}
// Every whole percent maps to the band whose label contains it.
for (let p = 0; p <= 100; p++) {
  const { letter } = percentToGpa(p);
  const b = PERCENT_BANDS.find((x) => x.letter === letter);
  if (b.label.startsWith('Below')) assert.ok(p < 65, `${p}`);
  else { const [lo, hi] = b.label.split('–').map(Number); assert.ok(p >= lo && p <= hi, `${p} in ${b.label}`); }
}
assert.equal(percentToGpa(90).points, 3.7);  // "Is 90% a 3.7 GPA?"
assert.equal(percentToGpa(85).letter, 'B');
assert.equal(percentToGpa(64.9).letter, 'D'); // rounds to 65
assert.equal(percentToGpa(64).letter, 'F');
assert.equal(percentToGpa(97).points433, 4.33);
assert.equal(percentToGpa(-1), null); assert.equal(percentToGpa(101), null); assert.equal(percentToGpa(NaN), null);

// cumulative
assert.equal(cumulativeGpa([]), null);
assert.equal(cumulativeGpa([{ gpa: 4, credits: 0 }]), null);
near(cumulativeGpa([{ gpa: 3, credits: 2 }, { gpa: 4, credits: 2 }]), 3.5, 'equal credits');

// requiredGpa and gpaAfter invert each other
near(gpaAfter(3.2, 10, requiredGpa(3.2, 10, 3.5, 5), 5), 3.5, 'round trip');

/* ---------- worked examples printed on the pages ---------- */
const mk = (grade, level = 'reg', credits = 1) => G.newClass({ grade, level, credits });
const run = (classes) => { const s = { ...G.fresh(), years: [{ id: 'y', name: 'x', classes }] }; const t = G.cumulative(s); return { u: G.gpa(t.qu, t.cr), w: G.gpa(t.qw, t.cr), t }; };

// how-to-calculate-gpa: unweighted 16.0 / 4.5 = 3.56
let r = run([mk('A'), mk('B+'), mk('B'), mk('A-'), mk('A', 'reg', 0.5)]);
near(r.t.qu, 16, 'how-to points'); near(r.t.cr, 4.5, 'how-to credits'); assert.equal(two(r.u), '3.56');
// how-to-calculate-gpa: weighted, Algebra II Honors + Biology AP, 17.5 / 4.5 = 3.89
r = run([mk('A'), mk('B+', 'hon'), mk('B', 'ap'), mk('A-'), mk('A', 'reg', 0.5)]);
near(r.t.qw, 17.5, 'how-to weighted points'); assert.equal(two(r.w), '3.89'); assert.equal(two(r.u), '3.56');
// how-to / cumulative page: 3.40 on 6 + 3.80 on 7 = 47.0 / 13 = 3.62, simple average 3.60
near(3.4 * 6 + 3.8 * 7, 47, 'cumulative points');
assert.equal(two(cumulativeGpa([{ gpa: 3.4, credits: 6 }, { gpa: 3.8, credits: 7 }])), '3.62');
// weighted-vs-unweighted: A AP, B Honors, A Regular
r = run([mk('A', 'ap'), mk('B', 'hon'), mk('A')]);
assert.equal(two(r.u), '3.67'); assert.equal(two(r.w), '4.17');
// weighted-vs-unweighted: same 4.20 weighted, different unweighted
r = run([mk('A', 'ap'), mk('A', 'ap'), mk('A', 'ap'), mk('A', 'ap'), mk('B')]);
assert.equal(two(r.w), '4.60'); assert.equal(two(r.u), '3.80');
r = run([mk('B', 'ap'), mk('B', 'ap'), mk('A', 'ap'), mk('A', 'ap'), mk('A', 'ap')]);
assert.equal(two(r.w), '4.60'); assert.equal(two(r.u), '3.60');
// weighted-vs-unweighted: dividing 5-scale by 5 × 4 is wrong for a mixed record
near(4.6 * 0.8, 3.68, 'scaling example');
// ap-honors: one AP A among 6 equal classes lifts weighted by 1/6
assert.equal(two(1 / 6), '0.17');
// raise page
assert.equal(two(requiredGpa(3.0, 12, 3.3, 6)), '3.90');
assert.equal(two(requiredGpa(3.0, 24, 3.3, 6)), '4.50');
assert.equal(two(gpaAfter(3.0, 24, 4.0, 6)), '3.20');
assert.equal(two(gpaAfter(3.0, 12, 4.0, 6)), '3.33');
// good-gpa page letter equivalents
assert.equal(G.SCALES.plus['A-'], 3.7); assert.equal(G.SCALES.plus['B+'], 3.3); assert.equal(G.SCALES.plus['C+'], 2.3); assert.equal(G.SCALES.plus['B-'], 2.7);
console.log('gpa-tools checks passed');
