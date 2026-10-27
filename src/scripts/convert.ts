// US GPA ⇄ German grade via the modified Bavarian formula: Note = 1 + 3 × (Nmax − Nd) / (Nmax − Nmin).
// US side uses Nmax = 4.0 (best) and Nmin = 2.0 (lowest pass); German side 1.0 (best) to 4.0 (lowest pass).
// An estimate only: there is no official US ⇄ German school grade conversion.

export const US_MAX = 4, US_PASS = 2;

/** US GPA → German grade, cut to one decimal and kept within the German 1,0–6,0 scale. Weighted GPAs above 4.0 give 1,0. */
export function usToGerman(gpa: number): number {
  const n = 1 + (3 * (US_MAX - gpa)) / (US_MAX - US_PASS);
  return Math.max(1, Math.min(6, Math.floor(n * 10 + 1e-9) / 10));
}

/** German grade → US GPA on a 4.0 scale, rounded to two decimals, never below 0. */
export function germanToUs(note: number): number {
  const g = US_MAX - ((note - 1) * (US_MAX - US_PASS)) / 3;
  return Math.max(0, Math.min(US_MAX, Math.round(g * 100) / 100));
}
