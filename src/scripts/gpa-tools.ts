// Pure math for the standalone GPA tools and the scale chart. No DOM. Tested by scripts/gpa-tools.test.mjs.
import { SCALES } from './gpa.ts';

/** Percent bands for the plus/minus chart, best first. `min` is the lowest whole percent in the band. */
export const PERCENT_BANDS = [
  { letter: 'A+', min: 97, label: '97–100' },
  { letter: 'A', min: 93, label: '93–96' },
  { letter: 'A-', min: 90, label: '90–92' },
  { letter: 'B+', min: 87, label: '87–89' },
  { letter: 'B', min: 83, label: '83–86' },
  { letter: 'B-', min: 80, label: '80–82' },
  { letter: 'C+', min: 77, label: '77–79' },
  { letter: 'C', min: 73, label: '73–76' },
  { letter: 'C-', min: 70, label: '70–72' },
  { letter: 'D+', min: 67, label: '67–69' },
  { letter: 'D', min: 65, label: '65–66' },
  { letter: 'F', min: 0, label: 'Below 65' },
] as const;

/** Letter and points for a percentage on the chart above, or null if out of range. Fractions round to the nearest whole percent. */
export function percentToGpa(percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  const p = Math.round(percent);
  const band = PERCENT_BANDS.find((b) => p >= b.min)!;
  return { letter: band.letter, points: SCALES.plus[band.letter], points433: SCALES.p433[band.letter] };
}

export type Term = { gpa: number; credits: number };

/** Credit-weighted GPA across terms. Null when there are no credits. */
export function cumulativeGpa(terms: Term[]): number | null {
  const credits = terms.reduce((sum, t) => sum + t.credits, 0);
  if (!(credits > 0)) return null;
  return terms.reduce((sum, t) => sum + t.gpa * t.credits, 0) / credits;
}

/** Average needed on the next credits to reach `target`. */
export const requiredGpa = (current: number, credits: number, target: number, nextCredits: number) =>
  (target * (credits + nextCredits) - current * credits) / nextCredits;

/** GPA after earning `termGpa` on the next credits. */
export const gpaAfter = (current: number, credits: number, termGpa: number, nextCredits: number) =>
  (current * credits + termGpa * nextCredits) / (credits + nextCredits);
