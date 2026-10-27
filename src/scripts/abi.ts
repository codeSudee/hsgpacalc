// Pure Abitur logic (KMK-Vereinbarung zur gymnasialen Oberstufe): no DOM, no storage.
// Shared by abi-rechner.ts and the node sanity checks (scripts/abi.test.mjs).

/** One subject in the Qualifikationsphase: four half-year results (0–15 or null = not entered / not counted). */
export type Subject = { id: string; name: string; lk: boolean; hj: (number | null)[] };
/** One Abitur exam subject: final points (0–15) in single weighting. */
export type Exam = { id: string; name: string; lk: boolean; p: number | null };
export type AbiState = { subjects: Subject[]; exams: Exam[]; examCount: 4 | 5 };

export const HALF_YEARS = ['Q1.1', 'Q1.2', 'Q2.1', 'Q2.2'];
export const MAX_TOTAL = 900;
export const MIN_TOTAL = 300;

export const uid = () => Math.random().toString(36).slice(2, 9);
export const newSubject = (o: Partial<Subject> = {}): Subject => ({ id: uid(), name: '', lk: false, hj: [null, null, null, null], ...o });
export const newExam = (o: Partial<Exam> = {}): Exam => ({ id: uid(), name: '', lk: false, p: null, ...o });
/** Typical setup: 2 Leistungskurse + 8 Grundkurse (40 results), 5 exams, PF1/PF2 on advanced level. */
export const fresh = (): AbiState => ({
  subjects: [newSubject({ lk: true }), newSubject({ lk: true }), ...Array.from({ length: 8 }, () => newSubject())],
  exams: Array.from({ length: 5 }, (_, i) => newExam({ lk: i < 2 })),
  examCount: 5,
});

/** Valid Notenpunkte are whole numbers 0–15. */
export const points = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 15 ? n : null;
};

/** Block I: E_I = round(P / S × 40), LK results counted twice. KMK Anlage: round half up. */
export function blockI(s: AbiState) {
  let P = 0, S = 0, n = 0, under5 = 0, zeros = 0;
  for (const sub of s.subjects) {
    const w = sub.lk ? 2 : 1;
    for (const v of sub.hj) {
      if (v === null) continue;
      P += v * w; S += w; n++;
      if (v < 5) under5++;
      if (v === 0) zeros++;
    }
  }
  return { points: S ? Math.round((P / S) * 40) : null, n, under5, zeros, maxUnder5: Math.floor(n * 0.2) };
}

/** Block II: 4 exams × 5 or 5 exams × 4, max 300. */
export function blockII(s: AbiState) {
  const exams = s.exams.slice(0, s.examCount);
  const filled = exams.filter((e) => e.p !== null);
  const sum = filled.reduce((a, e) => a + (e.p as number), 0);
  const factor = s.examCount === 4 ? 5 : 4;
  const ok5 = filled.filter((e) => (e.p as number) >= 5);
  return {
    points: filled.length ? sum * factor : null,
    complete: filled.length === exams.length,
    n: filled.length,
    ok5: ok5.length,
    ok5Lk: ok5.some((e) => e.lk),
    need5: s.examCount === 4 ? 2 : 3,
  };
}

/** Abiturdurchschnittsnote: N = 17/3 − E/180, cut (not rounded) to one decimal; 823+ = 1,0. Null below 300 (not passed). */
export function grade(total: number): number | null {
  if (!Number.isFinite(total) || total < MIN_TOTAL) return null;
  const n = Math.floor((17 / 3 - total / 180) * 10 + 1e-9) / 10;
  return Math.max(1, Math.min(4, n));
}

/** Lowest total that gives grade g (e.g. 1.0 → 823, 2.0 → 643). */
export function minTotalFor(g: number): number {
  return Math.max(MIN_TOTAL, Math.ceil((17 / 3 - g - 0.1) * 180 + 1e-9));
}

/** Points still missing for the next better grade, or null at 1,0. */
export function nextStep(total: number): { grade: number; need: number } | null {
  const g = grade(total);
  if (g === null || g <= 1) return null;
  const better = Math.round((g - 0.1) * 10) / 10;
  return { grade: better, need: minTotalFor(better) - total };
}

export type Check = { id: string; ok: boolean | null; label: string };

/** KMK minimum requirements. ok: null = not enough data yet. */
export function result(s: AbiState) {
  const b1 = blockI(s), b2 = blockII(s);
  // No total (and no grade) until every exam has points: a partial Block II would understate the result.
  const total = b1.points !== null && b2.complete ? b1.points + (b2.points as number) : null;
  const checks: Check[] = [
    { id: 'b1', ok: b1.points === null ? null : b1.points >= 200, label: 'Block I: mindestens 200 Punkte' },
    { id: 'u5', ok: b1.n ? b1.under5 <= b1.maxUnder5 : null, label: `Höchstens 20 % unter 5 Punkten (${b1.under5} von max. ${b1.maxUnder5})` },
    { id: 'z', ok: b1.n ? b1.zeros === 0 : null, label: 'Kein eingebrachter Kurs mit 0 Punkten' },
    { id: 'b2', ok: b2.complete ? (b2.points as number) >= 100 : null, label: 'Block II: mindestens 100 Punkte' },
    { id: 'p5', ok: b2.complete ? b2.ok5 >= b2.need5 && b2.ok5Lk : null, label: `Mindestens ${b2.need5} Prüfungen mit 5+ Punkten, davon eine auf erhöhtem Niveau` },
  ];
  const passed = checks.every((c) => c.ok === true) ? true : checks.some((c) => c.ok === false) ? false : null;
  return { b1, b2, total, grade: total === null ? null : grade(total), checks, passed };
}

/** German number format: 1.7 → "1,7". */
export const de = (n: number, d = 1) => n.toFixed(d).replace('.', ',');

/** Validate untrusted saved data. Returns null if unusable. */
export function sanitize(s: any): AbiState | null {
  if (!s || typeof s !== 'object' || !Array.isArray(s.subjects) || !Array.isArray(s.exams)) return null;
  const name = (v: unknown) => (typeof v === 'string' ? v.slice(0, 40) : '');
  const subjects = s.subjects.slice(0, 20).map((x: any) =>
    newSubject({ name: name(x?.name), lk: !!x?.lk, hj: [0, 1, 2, 3].map((i) => points(Array.isArray(x?.hj) ? x.hj[i] : null)) }));
  const exams = Array.from({ length: 5 }, (_, i) => newExam({ name: name(s.exams[i]?.name), lk: !!s.exams[i]?.lk, p: points(s.exams[i]?.p) }));
  if (!subjects.length) return null;
  return { subjects, exams, examCount: s.examCount === 4 ? 4 : 5 };
}
