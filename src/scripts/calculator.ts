import { gsap } from 'gsap';
import {
  type Cls, type Level, type ScaleId, type State, type Tot, type Year,
  DEFAULT_AP, DEFAULT_HONORS, YEAR_NAMES, SCALE_LABEL,
  bonusFor, clampBonus, cumulative, decodeShare, encodeShare, fresh, gpa, letterFor, maxUnweighted, maxWeighted,
  newClass, newYear, prior, sanitize, toCsv, totals, uid,
} from './gpa';

const KEY = 'hsgpa-v1';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const fmt = (n: number | null) => (n === null ? '–' : n.toFixed(2));
const bonusTxt = (n: number) => `+${+n.toFixed(2)}`;

function readStored(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
const isEmptyState = (s: State | null) => !s || (!prior(s) && s.years.every((y) => y.classes.every((c) => !c.grade && !c.name)));

let state = readStored() ?? fresh();
let storageOk = true;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOk = false; }
}
let bootMsg = '';
/** A shared link (#s=...) replaces saved data only if storage is empty or the user confirms. */
function applyHash() {
  const m = /^#s=([A-Za-z0-9_-]+)$/.exec(location.hash);
  if (!m) return;
  const shared = decodeShare(m[1]);
  if (!shared) bootMsg = 'The shared link could not be read.';
  else if (isEmptyState(readStored())) { state = shared; bootMsg = 'Loaded shared grades.'; }
  else if (confirm('This link contains shared grades. Replace the grades saved in this browser with them?')) { state = shared; bootMsg = 'Loaded shared grades.'; }
  else bootMsg = 'Kept your saved grades.';
  history.replaceState(null, '', location.pathname + location.search);
}
applyHash();

/* ---------- math (pure logic lives in gpa.ts) ---------- */
const all = () => cumulative(state);

/* ---------- rendering ---------- */
const yearsEl = $('#years');
const tplYear = $<HTMLTemplateElement>('#tpl-year');
const tplClass = $<HTMLTemplateElement>('#tpl-class');
const live = $('#live');
let announceTimer: number | undefined;

function classEl(c: Cls): HTMLElement {
  const el = tplClass.content.firstElementChild!.cloneNode(true) as HTMLElement;
  el.dataset.classId = c.id;
  const f = (n: string) => $<HTMLInputElement>(`[data-f="${n}"]`, el);
  f('name').value = c.name; f('level').value = c.level; f('grade').value = c.grade;
  f('credits').value = String(c.credits); f('exclude').checked = c.exclude;
  el.dataset.excluded = String(c.exclude);
  labelRemove(el, c.name);
  levelLabels(el);
  return el;
}
function labelRemove(el: HTMLElement, name: string) {
  $('[data-action="remove-class"]', el).setAttribute('aria-label', `Remove class${name ? ' ' + name : ''}`);
}
function yearEl(y: Year): HTMLElement {
  const el = tplYear.content.firstElementChild!.cloneNode(true) as HTMLElement;
  el.dataset.yearId = y.id;
  $<HTMLInputElement>('[data-f="yname"]', el).value = y.name;
  el.setAttribute('aria-label', y.name || 'Year');
  const box = $('[data-classes]', el);
  y.classes.forEach((c) => box.appendChild(classEl(c)));
  return el;
}
function renderAll() {
  yearsEl.replaceChildren(...state.years.map(yearEl));
  refresh(false);
}

const R = { w: $<SVGCircleElement>('[data-g-w]'), u: $<SVGCircleElement>('[data-g-u]') };
function setRing(el: SVGCircleElement, v: number | null, animate: boolean) {
  const c = +el.dataset.c!;
  const off = c * (1 - Math.max(0, Math.min(4, v ?? 0)) / 4);
  if (reduced || !animate) el.setAttribute('stroke-dashoffset', String(off));
  else gsap.to(el, { attr: { 'stroke-dashoffset': off }, duration: 0.7, ease: 'power3.out', overwrite: true });
}

function refresh(animate = true, persist = true) {
  const tot = all();
  const u = gpa(tot.qu, tot.cr), w = gpa(tot.qw, tot.cr);
  $('[data-gpa-u]').textContent = fmt(u);
  $('[data-gpa-u2]').textContent = fmt(u);
  $('[data-gpa-w]').textContent = fmt(w);
  const pr = prior(state);
  let meta = tot.n || pr ? `${tot.n} ${tot.n === 1 ? 'class' : 'classes'} counted, ${+tot.cr.toFixed(2)} credits${pr ? ` (incl. ${+pr.cr.toFixed(2)} prior)` : ''}` : 'Add grades to see your GPA.';
  if ((w ?? 0) > 4 + 1e-9 || (u ?? 0) > 4 + 1e-9) meta += '. Weighted GPA can exceed 4.0; the rings stop at 4.0.';
  $('[data-gpa-meta]').textContent = meta;
  setRing(R.u, u, animate); setRing(R.w, w, animate);

  // per-year
  const list = $('#year-summary');
  list.replaceChildren();
  state.years.forEach((y) => {
    const t = totals(state, y.classes);
    const yu = gpa(t.qu, t.cr), yw = gpa(t.qw, t.cr);
    const yEl = yearsEl.querySelector(`[data-year-id="${y.id}"] [data-year-gpa]`);
    if (yEl) yEl.textContent = t.n ? `${fmt(yu)} UW / ${fmt(yw)} W` : '–';
    const li = document.createElement('li');
    li.className = 'flex items-baseline justify-between gap-3 text-[13px]';
    const a = document.createElement('span'); a.textContent = y.name || 'Year'; a.className = 'truncate';
    const b = document.createElement('span'); b.className = 'num text-[var(--ink)] whitespace-nowrap';
    b.textContent = t.n ? `${fmt(yu)} / ${fmt(yw)}` : '–';
    li.append(a, b); list.appendChild(li);
  });
  if (pr) {
    const li = document.createElement('li');
    li.className = 'flex items-baseline justify-between gap-3 text-[13px]';
    li.innerHTML = '<span class="truncate">Previous GPA</span><span class="num text-[var(--ink)] whitespace-nowrap"></span>';
    li.lastElementChild!.textContent = `${fmt(pr.u)} / ${fmt(pr.w)}`;
    list.appendChild(li);
  }
  trend();
  const head = document.createElement('li');
  head.className = 'flex justify-between text-[11px] text-[var(--mute)] num';
  head.innerHTML = '<span></span><span>unweighted / weighted</span>';
  list.prepend(head);

  // good GPA table
  document.querySelectorAll<HTMLElement>('[data-good-row]').forEach((r) => {
    const hit = u !== null && u >= +r.dataset.min! && u < +r.dataset.max!;
    if (hit) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
  });

  planner(tot);
  if (persist) save();

  clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    live.textContent = u === null ? 'No grades entered.' : `Cumulative GPA: ${fmt(u)} unweighted, ${fmt(w)} weighted.`;
  }, 500);
}

function planner(tot: Tot) {
  const out = $('#t-result');
  const target = parseFloat(state.target), up = parseFloat(state.tCredits);
  if (!(target > 0) || !(up > 0)) { out.textContent = 'Enter a target and the credits you have left to see what you need.'; return; }
  const q = state.tType === 'u' ? tot.qu : tot.qw;
  const need = (target * (tot.cr + up) - q) / up;
  const label = state.tType === 'u' ? 'unweighted' : 'weighted';
  if (need <= 0) out.textContent = `You are already ahead: even straight F's would keep you at or above ${target.toFixed(2)} ${label}.`;
  else if (state.tType === 'u' && need > maxUnweighted(state.scale) + 1e-9) out.textContent = `A ${target.toFixed(2)} unweighted is out of reach in ${up} credits: you would need ${need.toFixed(2)} but the max is ${maxUnweighted(state.scale).toFixed(2)}. Add more credits or lower the target.`;
  else if (state.tType === 'w' && need > maxWeighted(state) + 1e-9) out.textContent = `A ${target.toFixed(2)} weighted needs ${need.toFixed(2)} per credit, above the highest possible ${maxWeighted(state).toFixed(2)}. Add more credits or lower the target.`;
  else if (need > maxUnweighted(state.scale) || (state.tType === 'u' && need > 4)) out.textContent = `You need a ${need.toFixed(2)} average on upcoming credits. That is above the top of the plain scale, so it takes Honors or AP / IB classes with high grades.`;
  else out.textContent = `You need a ${need.toFixed(2)} average (about a ${letterFor(state.scale, need)}) across your next ${up} credits to reach ${target.toFixed(2)} ${label}.`;
}

/* ---------- events ---------- */
function ctx(t: Element) {
  const yEl = t.closest<HTMLElement>('[data-year-id]');
  const year = state.years.find((y) => y.id === yEl?.dataset.yearId);
  const cEl = t.closest<HTMLElement>('[data-class-id]');
  const cls = year?.classes.find((c) => c.id === cEl?.dataset.classId);
  return { yEl, year, cEl, cls };
}
function intro(el: Element) {
  if (!reduced) gsap.from(el, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
}

function onEdit(e: Event) {
  const t = e.target as HTMLInputElement;
  const f = t.dataset?.f;
  if (!f) return;
  const { year, cls, cEl } = ctx(t);
  if (f === 'yname' && year) {
    year.name = t.value;
    t.closest('[data-year]')!.setAttribute('aria-label', t.value || 'Year');
  } else if (cls && cEl) {
    if (f === 'name') { cls.name = t.value; labelRemove(cEl, t.value); }
    if (f === 'level') cls.level = t.value as Level;
    if (f === 'grade') cls.grade = t.value;
    if (f === 'credits') { const n = parseFloat(t.value); cls.credits = Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0; }
    if (f === 'exclude') { cls.exclude = t.checked; cEl.dataset.excluded = String(t.checked); }
  }
  refresh();
}
yearsEl.addEventListener('input', onEdit);
yearsEl.addEventListener('change', onEdit);

const root = $('[data-calc]');
root.addEventListener('click', async (e) => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-action],[data-scale]');
  if (!btn) return;
  if (btn.dataset.scale) { setScale(btn.dataset.scale as ScaleId); return; }
  const a = btn.dataset.action;
  const { year, cEl, yEl } = ctx(btn);
  if (a === 'add-class' && year && yEl) {
    const c = newClass(); year.classes.push(c);
    const el = classEl(c); $('[data-classes]', yEl).appendChild(el); intro(el);
    $<HTMLElement>('[data-f="name"]', el).focus();
    refresh(false);
  } else if (a === 'remove-class' && year && cEl) {
    const i = year.classes.findIndex((c) => c.id === cEl.dataset.classId);
    const [removed] = year.classes.splice(i, 1);
    cEl.remove();
    refresh(false);
    const yid = year.id;
    toast('Class removed.', () => {
      const y = state.years.find((v) => v.id === yid);
      const box = y && yearsEl.querySelector(`[data-year-id="${yid}"] [data-classes]`);
      if (!y || !box) return;
      const at = Math.min(i, y.classes.length);
      y.classes.splice(at, 0, removed);
      const el = classEl(removed);
      box.insertBefore(el, box.children[at] ?? null);
      refresh(false); intro(el);
      $<HTMLElement>('[data-f="name"]', el).focus();
    }, () => $<HTMLElement>('[data-action="add-class"]', yearsEl.querySelector(`[data-year-id="${yid}"]`) ?? document).focus());
  } else if (a === 'add-year') {
    const n = state.years.length;
    const y = newYear(n < YEAR_NAMES.length ? YEAR_NAMES[n] : `Year ${n + 1}`, 1);
    state.years.push(y);
    const el = yearEl(y); yearsEl.appendChild(el); intro(el);
    $<HTMLElement>('[data-f="yname"]', el).focus();
    refresh(false);
  } else if (a === 'remove-year' && year) {
    const addYear = () => $<HTMLElement>('[data-action="add-year"]').focus();
    if (state.years.length === 1) {
      const oldClasses = year.classes;
      year.classes = [newClass()]; renderAll();
      toast('Year cleared.', () => { year.classes = oldClasses; renderAll(); }, addYear);
      return;
    }
    const idx = state.years.indexOf(year);
    state.years.splice(idx, 1);
    yEl!.remove();
    refresh(false);
    toast('Year removed.', () => {
      const at = Math.min(idx, state.years.length);
      state.years.splice(at, 0, year);
      const el = yearEl(year);
      yearsEl.insertBefore(el, yearsEl.children[at] ?? null);
      refresh(false); intro(el);
      $<HTMLElement>('[data-f="yname"]', el).focus();
    }, addYear);
  } else if (a === 'sample') sample();
  else if (a === 'reset') {
    if (!confirm('Clear all years and classes?')) return;
    const { scale, honors, ap } = state;
    state = { ...fresh(), scale, honors, ap };
    syncSettings();
    hideToast(false); renderAll(); say('All data cleared.');
  } else if (a === 'copy') copy(btn);
  else if (a === 'copy-link') copyLink(btn);
  else if (a === 'csv') downloadCsv();
  else if (a === 'reset-bonus') { state.honors = DEFAULT_HONORS; state.ap = DEFAULT_AP; syncSettings(); refresh(); }
  else if (a === 'share') share();
  else if (a === 'print') { $('#print-note').textContent = summary(); window.print(); }
});

/* ---------- undo toast ---------- */
const toastEl = $('#toast');
const toastMsg = $('[data-toast-msg]', toastEl);
const toastUndo = $<HTMLButtonElement>('[data-toast-undo]', toastEl);
let toastTimer: number | undefined;
let toastUndoFn: (() => void) | null = null;
let toastDoneFn: (() => void) | null = null;
function hideToast(restoreFocus: boolean) {
  clearTimeout(toastTimer);
  const had = toastEl.contains(document.activeElement);
  toastEl.hidden = true; toastUndoFn = null;
  const done = toastDoneFn; toastDoneFn = null;
  if (had && restoreFocus) done?.();
}
function toast(msg: string, undo: () => void, onDone: () => void) {
  hideToast(false);
  toastMsg.textContent = msg;
  toastUndoFn = undo; toastDoneFn = onDone;
  toastEl.hidden = false;
  toastUndo.focus(); // keyboard users land on Undo; focus returns to a stable control when it closes
  startToastTimer();
}
function startToastTimer() { clearTimeout(toastTimer); toastTimer = window.setTimeout(() => hideToast(true), 6000); }
toastUndo.addEventListener('click', () => { const fn = toastUndoFn; hideToast(false); fn?.(); say('Restored.'); });
toastEl.addEventListener('focusin', () => clearTimeout(toastTimer));
toastEl.addEventListener('focusout', () => { if (!toastEl.hidden) startToastTimer(); });
toastEl.addEventListener('mouseenter', () => clearTimeout(toastTimer));
toastEl.addEventListener('mouseleave', () => { if (!toastEl.hidden) startToastTimer(); });
toastEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideToast(true); });

function say(msg: string) { live.textContent = ''; setTimeout(() => (live.textContent = msg), 50); }

function setScale(sc: ScaleId) {
  state.scale = sc;
  syncScaleUI();
  refresh();
}
const SCALE_NOTE: Record<ScaleId, string> = {
  plus: 'Plus / minus scale: A = 4.0, A- = 3.7, B+ = 3.3 and so on.',
  plain: 'Letters-only scale: A+, A and A- = 4.0, B+/B/B- = 3.0 and so on.',
  p433: '4.33 scale: A+ = 4.33, A = 4.0, A- = 3.67, B+ = 3.33 and so on. Unweighted GPA can reach 4.33.',
};
function syncScaleUI() {
  document.querySelectorAll<HTMLElement>('[data-scale]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scale === state.scale)));
  $('#scale-note').textContent = `${SCALE_NOTE[state.scale]} Honors adds ${state.honors} and AP / IB / Dual Enrollment adds ${state.ap} to weighted GPA for passing grades (change in settings below).`;
}
/** Settings inputs and the level labels in every class row. */
const sHonors = $<HTMLInputElement>('#s-honors'), sAp = $<HTMLInputElement>('#s-ap');
const pU = $<HTMLInputElement>('#p-u'), pW = $<HTMLInputElement>('#p-w'), pCr = $<HTMLInputElement>('#p-cr');
function levelLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLOptionElement>('option[data-lv]').forEach((o) => {
    o.textContent = o.dataset.lv === 'hon' ? `Honors (${bonusTxt(state.honors)})` : `AP / IB / Dual Enrollment (${bonusTxt(state.ap)})`;
  });
}
function syncSettings() {
  sHonors.value = String(state.honors); sAp.value = String(state.ap);
  pU.value = state.priorU; pW.value = state.priorW; pCr.value = state.priorCr;
  levelLabels(); syncScaleUI();
}
const onBonus = (el: HTMLInputElement, k: 'honors' | 'ap') => () => {
  if (el.value.trim() === '') return; // wait for a value; blur restores the saved one
  state[k] = clampBonus(parseFloat(el.value), k === 'honors' ? DEFAULT_HONORS : DEFAULT_AP);
  levelLabels(); syncScaleUI(); refresh(false);
};
sHonors.addEventListener('input', onBonus(sHonors, 'honors'));
sAp.addEventListener('input', onBonus(sAp, 'ap'));
[sHonors, sAp].forEach((el, i) => el.addEventListener('blur', () => { el.value = String(i ? state.ap : state.honors); }));
pU.addEventListener('input', () => { state.priorU = pU.value; refresh(false); });
pW.addEventListener('input', () => { state.priorW = pW.value; refresh(false); });
pCr.addEventListener('input', () => { state.priorCr = pCr.value; refresh(false); });

function sample() {
  const mk = (n: string, l: Level, g: string, c = 1) => newClass({ name: n, level: l, grade: g, credits: c });
  state.years = [
    { id: uid(), name: '9th Grade', classes: [mk('English 9', 'hon', 'A-'), mk('Algebra II', 'reg', 'B+'), mk('Biology', 'reg', 'A'), mk('World History', 'reg', 'A-'), mk('P.E.', 'reg', 'A', 0.5)] },
    { id: uid(), name: '10th Grade', classes: [mk('English 10', 'hon', 'B+'), mk('Geometry', 'hon', 'A'), mk('Chemistry', 'hon', 'B'), mk('AP World History', 'ap', 'A-'), mk('Spanish II', 'reg', 'A')] },
    { id: uid(), name: '11th Grade', classes: [mk('AP English Language', 'ap', 'A'), mk('AP Calculus AB', 'ap', 'B+'), mk('Physics', 'hon', 'A-'), mk('AP US History', 'ap', 'B'), mk('Spanish III', 'reg', 'A')] },
  ];
  hideToast(false); renderAll(); say('Sample grades loaded.');
}

/* ---------- share / copy ---------- */
function summary(): string {
  const t = all();
  const lines = [`High School GPA: ${fmt(gpa(t.qu, t.cr))} unweighted, ${fmt(gpa(t.qw, t.cr))} weighted (${SCALE_LABEL[state.scale]} scale, ${+t.cr.toFixed(2)} credits)`];
  state.years.forEach((y) => { const yt = totals(state, y.classes); if (yt.n) lines.push(`${y.name || 'Year'}: ${fmt(gpa(yt.qu, yt.cr))} UW / ${fmt(gpa(yt.qw, yt.cr))} W`); });
  lines.push(`Calculated at ${location.origin}${location.pathname}`);
  return lines.join('\n');
}
async function copy(btn: HTMLElement) {
  const text = summary();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = ok ? 'Copied' : 'Copy Failed';
  say(ok ? 'Results copied to clipboard.' : 'Could not copy results.');
  setTimeout(() => (btn.textContent = old), 1600);
}
async function share() {
  try { await navigator.share({ title: 'My high school GPA', text: summary(), url: location.origin + location.pathname }); } catch {}
}
if (typeof navigator.share === 'function') $<HTMLElement>('[data-action="share"]').hidden = false;


function shareUrl() { return `${location.origin}${location.pathname}#s=${encodeShare(state)}`; }
async function copyLink(btn: HTMLElement) {
  const text = shareUrl();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = ok ? 'Link Copied' : 'Copy Failed';
  say(ok ? 'Link with your grades copied to clipboard.' : 'Could not copy the link.');
  setTimeout(() => (btn.textContent = old), 1600);
}
function downloadCsv() {
  const url = URL.createObjectURL(new Blob(['\ufeff' + toCsv(state)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'hs-gpa.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say('CSV downloaded.');
}

/* ---------- yearly trend (inline SVG) ---------- */
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string, attrs: Record<string, string | number> = {}, text?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}
function trend() {
  const wrap = $('#trend-wrap'), box = $('#trend');
  const pts = state.years.map((y, i) => {
    const t = totals(state, y.classes);
    return t.n ? { i, name: y.name || `Year ${i + 1}`, u: t.qu / t.cr, w: t.qw / t.cr } : null;
  }).filter((p): p is { i: number; name: string; u: number; w: number } => !!p);
  wrap.hidden = pts.length < 2;
  box.replaceChildren();
  if (pts.length < 2) return;

  const W = 320, H = 150, L = 30, Rr = 12, T = 10, B = 24;
  const vals = pts.flatMap((p) => [p.u, p.w]);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.1) * 2) / 2);
  let hi = Math.ceil(Math.max(...vals) * 2) / 2;
  if (hi - lo < 1) hi = lo + 1;
  const n = state.years.length;
  const x = (i: number) => (n === 1 ? (L + W - Rr) / 2 : L + ((W - L - Rr) * i) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'block w-full', role: 'img' });
  svg.setAttribute('aria-label', 'Yearly GPA trend, unweighted and weighted. ' + pts.map((p) => `${p.name}: ${fmt(p.u)} unweighted, ${fmt(p.w)} weighted`).join('; ') + '.');
  svg.appendChild(svgEl('title', {}, 'Yearly GPA trend'));
  for (const v of [lo, (lo + hi) / 2, hi]) {
    svg.appendChild(svgEl('line', { x1: L, x2: W - Rr, y1: y(v), y2: y(v), stroke: 'var(--hairline)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: L - 6, y: y(v) + 3.5, 'text-anchor': 'end', fill: 'var(--mute)', 'font-size': 10, 'font-family': 'var(--font-mono)' }, v.toFixed(1)));
  }
  pts.forEach((p) => {
    const short = p.name.replace(/\s*grade/i, '').slice(0, 8);
    svg.appendChild(svgEl('text', { x: x(p.i), y: H - 7, 'text-anchor': 'middle', fill: 'var(--mute)', 'font-size': 10, 'font-family': 'var(--font-mono)' }, short));
  });
  const series: Array<[keyof typeof pts[number], string, string, string]> = [
    ['u', 'var(--ring-unweighted)', '4 3', 'unweighted'],
    ['w', 'var(--ring-weighted)', '', 'weighted'],
  ];
  for (const [k, color, dash, label] of series) {
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p[k] as number).toFixed(1)}`).join('');
    const line = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    if (dash) line.setAttribute('stroke-dasharray', dash);
    svg.appendChild(line);
    pts.forEach((p) => {
      const c = svgEl('circle', { cx: x(p.i), cy: y(p[k] as number), r: 4, fill: color, stroke: 'var(--elevated)', 'stroke-width': 2 });
      c.appendChild(svgEl('title', {}, `${p.name}: ${fmt(p[k] as number)} ${label}`));
      svg.appendChild(c);
    });
  }
  box.appendChild(svg);
}

/* ---------- planner inputs ---------- */
const tTarget = $<HTMLInputElement>('#t-target'), tCredits = $<HTMLInputElement>('#t-credits'), tType = $<HTMLSelectElement>('#t-type');
tTarget.value = state.target; tCredits.value = state.tCredits; tType.value = state.tType;
tTarget.addEventListener('input', () => { state.target = tTarget.value; refresh(false); });
tCredits.addEventListener('input', () => { state.tCredits = tCredits.value; refresh(false); });
tType.addEventListener('change', () => { state.tType = tType.value as 'u' | 'w'; refresh(false); });

/* ---------- boot ---------- */
syncSettings();
renderAll();
if (!reduced) {
  gsap.from('[data-reveal]', { opacity: 0, y: 12, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
}
if (!storageOk) say('Saving is unavailable in this browser.');
else if (bootMsg) say(bootMsg);
if (!storageOk && bootMsg) setTimeout(() => say(bootMsg), 1500);
