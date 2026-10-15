// Pure GPA logic: no DOM, no storage. Shared by calculator.ts and the node sanity checks (scripts/gpa.test.mjs).

export type Level = 'reg' | 'hon' | 'ap';
export type ScaleId = 'plus' | 'plain' | 'p433';
export type Cls = { id: string; name: string; level: Level; grade: string; credits: number; exclude: boolean };
export type Year = { id: string; name: string; classes: Cls[] };
export type State = {
  scale: ScaleId;
  honors: number;
  ap: number;
  priorU: string; // previous cumulative unweighted GPA (text so partial typing is kept)
  priorW: string; // previous cumulative weighted GPA, blank = same as unweighted
  priorCr: string; // credits behind the previous GPA
  years: Year[];
  target: string;
  tCredits: string;
  tType: 'u' | 'w';
};
export type Tot = { cr: number; qu: number; qw: number; n: number };

export const DEFAULT_HONORS = 0.5;
export const DEFAULT_AP = 1;
export const MAX_BONUS = 2;
export const YEAR_NAMES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export const SCALES: Record<ScaleId, Record<string, number>> = {
  plus: { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': 0.7, F: 0 },
  plain: { 'A+': 4, A: 4, 'A-': 4, 'B+': 3, B: 3, 'B-': 3, 'C+': 2, C: 2, 'C-': 2, 'D+': 1, D: 1, 'D-': 1, F: 0 },
  p433: { 'A+': 4.33, A: 4, 'A-': 3.67, 'B+': 3.33, B: 3, 'B-': 2.67, 'C+': 2.33, C: 2, 'C-': 1.67, 'D+': 1.33, D: 1, 'D-': 0.67, F: 0 },
};
export const SCALE_LABEL: Record<ScaleId, string> = { plus: 'plus/minus', plain: 'letters-only', p433: '4.33 plus/minus' };

export const uid = () => Math.random().toString(36).slice(2, 9);
export const newClass = (o: Partial<Cls> = {}): Cls => ({ id: uid(), name: '', level: 'reg', grade: '', credits: 1, exclude: false, ...o });
export const newYear = (name: string, n = 3): Year => ({ id: uid(), name, classes: Array.from({ length: n }, () => newClass()) });
export const fresh = (): State => ({
  scale: 'plus', honors: DEFAULT_HONORS, ap: DEFAULT_AP, priorU: '', priorW: '', priorCr: '',
  years: [newYear(YEAR_NAMES[0])], target: '', tCredits: '4', tType: 'u',
});

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const clampBonus = (n: number, fallback: number) => (Number.isFinite(n) ? Math.round(clamp(n, 0, MAX_BONUS) * 100) / 100 : fallback);
const str = (v: unknown, d = '', max = 12) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : d);

/** Validate untrusted data (localStorage, URL hash). Old saves without new fields get defaults. Returns null if unusable. */
export function sanitize(s: any): State | null {
  if (!s || typeof s !== 'object' || !Array.isArray(s.years) || !s.years.length) return null;
  const scale: ScaleId = s.scale === 'plain' || s.scale === 'p433' ? s.scale : 'plus';
  return {
    scale,
    honors: clampBonus(typeof s.honors === 'number' ? s.honors : NaN, DEFAULT_HONORS),
    ap: clampBonus(typeof s.ap === 'number' ? s.ap : NaN, DEFAULT_AP),
    priorU: str(s.priorU), priorW: str(s.priorW), priorCr: str(s.priorCr),
    target: str(s.target, ''), tCredits: str(s.tCredits, '4'),
    tType: s.tType === 'w' ? 'w' : 'u',
    years: s.years.slice(0, 12).map((y: any): Year => ({
      id: String(y?.id || uid()),
      name: String(y?.name ?? '').slice(0, 30),
      classes: Array.isArray(y?.classes)
        ? y.classes.slice(0, 60).map((c: any): Cls => ({
            id: String(c?.id || uid()),
            name: String(c?.name ?? '').slice(0, 60),
            level: c?.level === 'hon' || c?.level === 'ap' ? c.level : 'reg',
            grade: typeof c?.grade === 'string' && c.grade in SCALES.plus ? c.grade : '',
            credits: Number.isFinite(+c?.credits) ? clamp(+c.credits, 0, 10) : 1,
            exclude: !!c?.exclude,
          }))
        : [],
    })),
  };
}

/* ---------- math ---------- */
export const pts = (scale: ScaleId, g: string) => SCALES[scale][g] ?? 0;
export const bonusFor = (s: Pick<State, 'honors' | 'ap'>, l: Level) => (l === 'hon' ? s.honors : l === 'ap' ? s.ap : 0);
/** Highest unweighted value on the scale (4.0, or 4.33). */
export const maxUnweighted = (scale: ScaleId) => Math.max(...Object.values(SCALES[scale]));
export const maxWeighted = (s: Pick<State, 'scale' | 'honors' | 'ap'>) => maxUnweighted(s.scale) + Math.max(s.honors, s.ap);

export function totals(s: State, classes: Cls[]): Tot {
  const t = { cr: 0, qu: 0, qw: 0, n: 0 };
  for (const c of classes) {
    if (!c.grade || c.exclude || !(c.credits > 0)) continue;
    const p = pts(s.scale, c.grade);
    t.cr += c.credits; t.n++;
    t.qu += p * c.credits;
    t.qw += (p + (p > 0 ? bonusFor(s, c.level) : 0)) * c.credits;
  }
  return t;
}
/** Parsed prior GPA, or null when not (validly) entered. */
export function prior(s: State): { u: number; w: number; cr: number } | null {
  const u = parseFloat(s.priorU), cr = parseFloat(s.priorCr);
  if (!Number.isFinite(u) || !(cr > 0) || u < 0) return null;
  const w = parseFloat(s.priorW);
  return { u: clamp(u, 0, 7), w: Number.isFinite(w) && w >= 0 ? clamp(w, 0, 10) : clamp(u, 0, 7), cr: clamp(cr, 0, 400) };
}
/** Cumulative totals over every year plus the optional prior GPA. */
export function cumulative(s: State): Tot {
  const t = totals(s, s.years.flatMap((y) => y.classes));
  const p = prior(s);
  if (p) { t.cr += p.cr; t.qu += p.u * p.cr; t.qw += p.w * p.cr; }
  return t;
}
export const gpa = (q: number, cr: number) => (cr > 0 ? q / cr : null);

export function letterFor(scale: ScaleId, p: number): string {
  let best = 'F', diff = 99;
  for (const [l, v] of Object.entries(SCALES[scale])) { if (l === 'A+') continue; const d = Math.abs(v - p); if (d < diff - 1e-9) { diff = d; best = l; } }
  return best;
}

/* ---------- share link ---------- */
const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (b: string) => {
  const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const LV: Level[] = ['reg', 'hon', 'ap'];

/** Compact, versioned payload (ids are dropped and regenerated on load). */
export function encodeShare(s: State): string {
  const o = {
    v: 1, s: s.scale, h: s.honors, a: s.ap, p: [s.priorU, s.priorW, s.priorCr], t: [s.target, s.tCredits, s.tType],
    y: s.years.map((y) => [y.name, y.classes.map((c) => [c.name, LV.indexOf(c.level), c.grade, c.credits, c.exclude ? 1 : 0])]),
  };
  return toB64(JSON.stringify(o));
}
export function decodeShare(b: string): State | null {
  try {
    const o = JSON.parse(fromB64(b));
    if (!o || o.v !== 1 || !Array.isArray(o.y)) return null;
    return sanitize({
      scale: o.s, honors: o.h, ap: o.a,
      priorU: o.p?.[0], priorW: o.p?.[1], priorCr: o.p?.[2],
      target: o.t?.[0], tCredits: o.t?.[1], tType: o.t?.[2],
      years: o.y.map((y: any) => ({
        name: y?.[0],
        classes: (Array.isArray(y?.[1]) ? y[1] : []).map((c: any) => ({ name: c?.[0], level: LV[c?.[1]] ?? 'reg', grade: c?.[2], credits: c?.[3], exclude: !!c?.[4] })),
      })),
    });
  } catch {
    return null;
  }
}

/* ---------- CSV ---------- */
const cell = (v: string | number) => {
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = "'" + t; // spreadsheet formula injection guard
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const LEVEL_NAME: Record<Level, string> = { reg: 'Regular', hon: 'Honors', ap: 'AP/IB/DE' };
export function toCsv(s: State): string {
  const f = (n: number | null) => (n === null ? '' : n.toFixed(2));
  const rows: (string | number)[][] = [['Year', 'Class', 'Level', 'Grade', 'Credits', 'Counted', 'Unweighted points', 'Weighted points']];
  for (const y of s.years) {
    for (const c of y.classes) {
      const counted = !!c.grade && !c.exclude && c.credits > 0;
      const p = c.grade ? pts(s.scale, c.grade) : null;
      rows.push([y.name, c.name, LEVEL_NAME[c.level], c.grade, c.credits, counted ? 'yes' : 'no',
        p === null ? '' : f(p), p === null ? '' : f(p + (p > 0 ? bonusFor(s, c.level) : 0))]);
    }
  }
  rows.push([]);
  for (const y of s.years) { const t = totals(s, y.classes); rows.push([`${y.name} GPA`, '', '', '', t.cr, '', f(gpa(t.qu, t.cr)), f(gpa(t.qw, t.cr))]); }
  const p = prior(s);
  if (p) rows.push(['Prior GPA', '', '', '', p.cr, '', f(p.u), f(p.w)]);
  const t = cumulative(s);
  rows.push(['Cumulative GPA', '', '', '', t.cr, '', f(gpa(t.qu, t.cr)), f(gpa(t.qw, t.cr))]);
  rows.push([`Scale: ${SCALE_LABEL[s.scale]}; Honors +${s.honors}; AP/IB/DE +${s.ap}`]);
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
