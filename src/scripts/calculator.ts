import { gsap } from 'gsap';
import {
  type Cls, type Level, type ScaleId, type State, type Tot, type Year,
  DEFAULT_AP, DEFAULT_HONORS, YEAR_NAMES,
  bonusFor, clampBonus, cumulative, decodeShare, encodeShare, fresh, gpa, letterFor, maxUnweighted, maxWeighted,
  newClass, newYear, prior, sanitize, toCsv, totals, uid,
} from './gpa';

const KEY = 'hsgpa-v1';

/** Localized strings, injected by Calculator.astro (see src/i18n). */
const T = JSON.parse(document.getElementById('i18n-data')!.textContent!) as typeof import('../i18n/en').en['js'];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
/** Untouched default year names ("9th Grade") follow the page language when saved grades come from another language. */
const ALL_YEAR_NAMES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade', '9.º grado', '10.º grado', '11.º grado', '12.º grado'];
const localizeYearNames = (s: State) => {
  s.years.forEach((y) => { const i = ALL_YEAR_NAMES.indexOf(y.name); if (i >= 0) y.name = T.yearNames[i % 4]; });
  return s;
};

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

let state = localizeYearNames(readStored() ?? fresh(T.yearNames));
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
  if (!shared) bootMsg = T.sharedBad;
  else if (isEmptyState(readStored())) { state = localizeYearNames(shared); bootMsg = T.sharedLoaded; }
  else if (confirm(T.sharedConfirm)) { state = localizeYearNames(shared); bootMsg = T.sharedLoaded; }
  else bootMsg = T.sharedKept;
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
  $('[data-action="remove-class"]', el).setAttribute('aria-label', name ? fill(T.removeClassNamed, { name }) : T.removeClass);
}
function yearEl(y: Year): HTMLElement {
  const el = tplYear.content.firstElementChild!.cloneNode(true) as HTMLElement;
  el.dataset.yearId = y.id;
  $<HTMLInputElement>('[data-f="yname"]', el).value = y.name;
  el.setAttribute('aria-label', y.name || T.year);
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

/** Counts a GPA readout from its currently shown value to the new one (~700ms ease-out). */
const shown = new WeakMap<Element, number>();
function setNum(el: Element, v: number | null, animate: boolean) {
  const from = shown.get(el);
  if (v === null || reduced || !animate || from === undefined || Math.abs(from - v) < 0.005) {
    el.textContent = fmt(v);
    if (v === null) shown.delete(el); else shown.set(el, v);
    return;
  }
  const o = { n: from };
  gsap.to(o, {
    n: v, duration: 0.7, ease: 'power3.out', overwrite: true,
    onUpdate: () => { el.textContent = o.n.toFixed(2); shown.set(el, o.n); },
    onComplete: () => { el.textContent = fmt(v); shown.set(el, v); },
  });
}
/** Owl pose follows the weighted GPA: 3.7+ great, under 3.0 keep going, otherwise neutral. */
const owl = $<SVGElement>('[data-owl]');
const owlText = $('[data-owl-text]');
function setOwl(w: number | null, animate: boolean) {
  const pose = w === null ? 'neutral' : w >= 3.7 ? 'great' : w < 3 ? 'keep' : 'neutral';
  const text = owlText.dataset[w === null ? 'tEmpty' : pose === 'great' ? 'tGreat' : pose === 'keep' ? 'tKeep' : 'tNeutral'] ?? '';
  if (owlText.textContent !== text) owlText.textContent = text;
  if (owl.dataset.pose === pose) return;
  owl.dataset.pose = pose;
  if (animate && !reduced) gsap.fromTo(owl, { scale: 0.88 }, { scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform' });
}
let wasGreat = false;
/** One-shot glow on the weighted readout when it crosses up to 4.0. */
function celebrate(w: number | null, animate: boolean) {
  const great = w !== null && w >= 4 - 1e-9;
  if (great && !wasGreat && animate && !reduced) {
    const box = $('[data-gpa-w]').parentElement!;
    box.classList.remove('glow-pulse'); void box.offsetWidth; box.classList.add('glow-pulse');
    // Small, short burst; the library loads only the first time it is needed.
    const r = box.getBoundingClientRect();
    const css = getComputedStyle(document.documentElement);
    import('canvas-confetti').then(({ default: confetti }) => confetti({
      particleCount: 36, spread: 70, startVelocity: 24, ticks: 110, gravity: 1.1, scalar: 0.8,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
      colors: [css.getPropertyValue('--ring-weighted').trim() || '#0070f3', css.getPropertyValue('--ink').trim() || '#171717', '#50e3c2'],
      disableForReducedMotion: true,
    }));
  }
  wasGreat = great;
}

function refresh(animate = true, persist = true) {
  const tot = all();
  const u = gpa(tot.qu, tot.cr), w = gpa(tot.qw, tot.cr);
  setNum($('[data-gpa-u]'), u, animate);
  setNum($('[data-gpa-u2]'), u, animate);
  setNum($('[data-gpa-w]'), w, animate);
  setOwl(w, animate);
  celebrate(w, animate);
  const pr = prior(state);
  let meta = tot.n || pr
    ? fill(T.metaCounted, { n: tot.n, cls: tot.n === 1 ? T.clsOne : T.clsMany, cr: +tot.cr.toFixed(2) }) + (pr ? fill(T.metaPrior, { pr: +pr.cr.toFixed(2) }) : '')
    : T.addGrades;
  if ((w ?? 0) > 4 + 1e-9 || (u ?? 0) > 4 + 1e-9) meta += T.metaOver;
  $('[data-gpa-meta]').textContent = meta;
  setRing(R.u, u, animate); setRing(R.w, w, animate);

  // per-year
  const list = $('#year-summary');
  list.replaceChildren();
  state.years.forEach((y) => {
    const t = totals(state, y.classes);
    const yu = gpa(t.qu, t.cr), yw = gpa(t.qw, t.cr);
    const yEl = yearsEl.querySelector(`[data-year-id="${y.id}"] [data-year-gpa]`);
    if (yEl) yEl.textContent = t.n ? fill(T.yearHeader, { u: fmt(yu), w: fmt(yw) }) : '–';
    const li = document.createElement('li');
    li.className = 'flex items-baseline justify-between gap-3 text-[13px]';
    const a = document.createElement('span'); a.textContent = y.name || T.year; a.className = 'truncate';
    const b = document.createElement('span'); b.className = 'num text-[var(--ink)] whitespace-nowrap';
    b.textContent = t.n ? `${fmt(yu)} / ${fmt(yw)}` : '–';
    li.append(a, b); list.appendChild(li);
  });
  if (pr) {
    const li = document.createElement('li');
    li.className = 'flex items-baseline justify-between gap-3 text-[13px]';
    li.innerHTML = '<span class="truncate"></span><span class="num text-[var(--ink)] whitespace-nowrap"></span>';
    li.firstElementChild!.textContent = T.prevGpa;
    li.lastElementChild!.textContent = `${fmt(pr.u)} / ${fmt(pr.w)}`;
    list.appendChild(li);
  }
  trend();
  const head = document.createElement('li');
  head.className = 'flex justify-between text-[11px] text-[var(--mute)] num';
  head.innerHTML = '<span></span><span></span>';
  head.lastElementChild!.textContent = T.colHead;
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
    live.textContent = u === null ? T.liveNone : fill(T.liveGpa, { u: fmt(u), w: fmt(w) });
  }, 500);
}

function planner(tot: Tot) {
  const out = $('#t-result');
  const target = parseFloat(state.target), up = parseFloat(state.tCredits);
  if (!(target > 0) || !(up > 0)) { out.textContent = T.plannerEmpty; return; }
  const q = state.tType === 'u' ? tot.qu : tot.qw;
  const need = (target * (tot.cr + up) - q) / up;
  const label = state.tType === 'u' ? T.labelU : T.labelW;
  const v = { t: target.toFixed(2), up, need: need.toFixed(2), label };
  if (need <= 0) out.textContent = fill(T.plannerAhead, v);
  else if (state.tType === 'u' && need > maxUnweighted(state.scale) + 1e-9) out.textContent = fill(T.plannerOutU, { ...v, max: maxUnweighted(state.scale).toFixed(2) });
  else if (state.tType === 'w' && need > maxWeighted(state) + 1e-9) out.textContent = fill(T.plannerOutW, { ...v, max: maxWeighted(state).toFixed(2) });
  else if (need > maxUnweighted(state.scale) || (state.tType === 'u' && need > 4)) out.textContent = fill(T.plannerHigh, v);
  else out.textContent = fill(T.plannerOk, { ...v, letter: letterFor(state.scale, need) });
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
    toast(T.classRemoved, () => {
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
    const y = newYear(n < YEAR_NAMES.length ? T.yearNames[n] : fill(T.yearN, { n: n + 1 }), 1);
    state.years.push(y);
    const el = yearEl(y); yearsEl.appendChild(el); intro(el);
    $<HTMLElement>('[data-f="yname"]', el).focus();
    refresh(false);
  } else if (a === 'remove-year' && year) {
    const addYear = () => $<HTMLElement>('[data-action="add-year"]').focus();
    if (state.years.length === 1) {
      const oldClasses = year.classes;
      year.classes = [newClass()]; renderAll();
      toast(T.yearCleared, () => { year.classes = oldClasses; renderAll(); }, addYear);
      return;
    }
    const idx = state.years.indexOf(year);
    state.years.splice(idx, 1);
    yEl!.remove();
    refresh(false);
    toast(T.yearRemoved, () => {
      const at = Math.min(idx, state.years.length);
      state.years.splice(at, 0, year);
      const el = yearEl(year);
      yearsEl.insertBefore(el, yearsEl.children[at] ?? null);
      refresh(false); intro(el);
      $<HTMLElement>('[data-f="yname"]', el).focus();
    }, addYear);
  } else if (a === 'sample') sample();
  else if (a === 'reset') {
    if (!confirm(T.confirmReset)) return;
    const { scale, honors, ap } = state;
    state = { ...fresh(T.yearNames), scale, honors, ap };
    syncSettings();
    hideToast(false); renderAll(); say(T.allCleared);
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
toastUndo.addEventListener('click', () => { const fn = toastUndoFn; hideToast(false); fn?.(); say(T.restored); });
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
function syncScaleUI() {
  document.querySelectorAll<HTMLElement>('[data-scale]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scale === state.scale)));
  $('#scale-note').textContent = `${T.scaleNote[state.scale]} ${fill(T.scaleNoteTail, { h: state.honors, a: state.ap })}`;
}
/** Settings inputs and the level labels in every class row. */
const sHonors = $<HTMLInputElement>('#s-honors'), sAp = $<HTMLInputElement>('#s-ap');
const pU = $<HTMLInputElement>('#p-u'), pW = $<HTMLInputElement>('#p-w'), pCr = $<HTMLInputElement>('#p-cr');
function levelLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLOptionElement>('option[data-lv]').forEach((o) => {
    o.textContent = o.dataset.lv === 'hon' ? fill(T.levelHon, { b: bonusTxt(state.honors) }) : fill(T.levelAp, { b: bonusTxt(state.ap) });
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
  const N = T.sampleNames;
  const g: [Level, string, number?][][] = [
    [['hon', 'A-'], ['reg', 'B+'], ['reg', 'A'], ['reg', 'A-'], ['reg', 'A', 0.5]],
    [['hon', 'B+'], ['hon', 'A'], ['hon', 'B'], ['ap', 'A-'], ['reg', 'A']],
    [['ap', 'A'], ['ap', 'B+'], ['hon', 'A-'], ['ap', 'B'], ['reg', 'A']],
  ];
  state.years = g.map((yr, i) => ({ id: uid(), name: T.yearNames[i], classes: yr.map(([l, gr, c], k) => mk(N[i][k], l, gr, c)) }));
  hideToast(false); renderAll(); say(T.sampleLoaded);
}

/* ---------- share / copy ---------- */
function summary(): string {
  const t = all();
  const lines = [fill(T.sumHead, { u: fmt(gpa(t.qu, t.cr)), w: fmt(gpa(t.qw, t.cr)), scale: T.scaleLabel[state.scale], cr: +t.cr.toFixed(2) })];
  state.years.forEach((y) => { const yt = totals(state, y.classes); if (yt.n) lines.push(fill(T.sumYear, { name: y.name || T.year, u: fmt(gpa(yt.qu, yt.cr)), w: fmt(gpa(yt.qw, yt.cr)) })); });
  lines.push(fill(T.sumAt, { url: location.origin + location.pathname }));
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
  btn.textContent = ok ? T.copied : T.copyFailed;
  say(ok ? T.liveCopied : T.liveCopyFail);
  setTimeout(() => (btn.textContent = old), 1600);
}
async function share() {
  try { await navigator.share({ title: T.shareTitle, text: summary(), url: location.origin + location.pathname }); } catch {}
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
  btn.textContent = ok ? T.linkCopied : T.copyFailed;
  say(ok ? T.liveLinkCopied : T.liveLinkFail);
  setTimeout(() => (btn.textContent = old), 1600);
}
function downloadCsv() {
  const url = URL.createObjectURL(new Blob(['\ufeff' + toCsv(state, { ...T.csv, scale: T.scaleLabel })], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = T.csvFile;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(T.csvDone);
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
    return t.n ? { i, name: y.name || fill(T.yearN, { n: i + 1 }), u: t.qu / t.cr, w: t.qw / t.cr } : null;
  }).filter((p): p is { i: number; name: string; u: number; w: number } => !!p);
  wrap.hidden = pts.length < 2;
  box.replaceChildren();
  if (pts.length < 2) return;

  const W = 320, H = 150, L = 30, Rr = 12, TOP = 10, B = 24;
  const vals = pts.flatMap((p) => [p.u, p.w]);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.1) * 2) / 2);
  let hi = Math.ceil(Math.max(...vals) * 2) / 2;
  if (hi - lo < 1) hi = lo + 1;
  const n = state.years.length;
  const x = (i: number) => (n === 1 ? (L + W - Rr) / 2 : L + ((W - L - Rr) * i) / (n - 1));
  const y = (v: number) => TOP + (H - TOP - B) * (1 - (v - lo) / (hi - lo));

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'block w-full', role: 'img' });
  svg.setAttribute('aria-label', T.trendAria + pts.map((p) => fill(T.trendItem, { name: p.name, u: fmt(p.u), w: fmt(p.w) })).join('; ') + '.');
  svg.appendChild(svgEl('title', {}, T.trendTitle));
  for (const v of [lo, (lo + hi) / 2, hi]) {
    svg.appendChild(svgEl('line', { x1: L, x2: W - Rr, y1: y(v), y2: y(v), stroke: 'var(--hairline)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: L - 6, y: y(v) + 3.5, 'text-anchor': 'end', fill: 'var(--mute)', 'font-size': 10, 'font-family': 'var(--font-mono)' }, v.toFixed(1)));
  }
  pts.forEach((p) => {
    const short = p.name.replace(new RegExp(`\\s*(grade|${T.gradeWord})`, 'i'), '').slice(0, 8);
    svg.appendChild(svgEl('text', { x: x(p.i), y: H - 7, 'text-anchor': 'middle', fill: 'var(--mute)', 'font-size': 10, 'font-family': 'var(--font-mono)' }, short));
  });
  const series: Array<[keyof typeof pts[number], string, string, string]> = [
    ['u', 'var(--ring-unweighted)', '4 3', T.labelU],
    ['w', 'var(--ring-weighted)', '', T.labelW],
  ];
  for (const [k, color, dash, label] of series) {
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p[k] as number).toFixed(1)}`).join('');
    const line = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    if (dash) line.setAttribute('stroke-dasharray', dash);
    svg.appendChild(line);
    pts.forEach((p) => {
      const c = svgEl('circle', { cx: x(p.i), cy: y(p[k] as number), r: 4, fill: color, stroke: 'var(--elevated)', 'stroke-width': 2 });
      c.appendChild(svgEl('title', {}, fill(T.trendPoint, { name: p.name, v: fmt(p[k] as number), label })));
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
if (!storageOk) say(T.storageOff);
else if (bootMsg) say(bootMsg);
if (!storageOk && bootMsg) setTimeout(() => say(bootMsg), 1500);
