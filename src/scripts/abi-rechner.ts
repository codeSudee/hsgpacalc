import { gsap } from 'gsap';
import { type AbiState, type Subject, MAX_TOTAL, de, fresh, newSubject, nextStep, points, result, sanitize } from './abi';
import { germanToUs } from './convert';

const KEY = 'abi-v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;

let storageOk = true;
function load(): AbiState {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? sanitize(JSON.parse(raw)) : null;
    if (s) return s;
  } catch { storageOk = false; }
  return fresh();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOk = false; }
}
let state = load();

const subjBox = $('#subjects'), examBox = $('#exams');
const tplS = $<HTMLTemplateElement>('#tpl-subject'), tplE = $<HTMLTemplateElement>('#tpl-exam');
const live = $('#abi-live');
function say(msg: string) { live.textContent = ''; setTimeout(() => (live.textContent = msg), 50); }

/* ---------- rows ---------- */
function subjectRow(s: Subject, i: number) {
  const row = tplS.content.firstElementChild!.cloneNode(true) as HTMLElement;
  row.dataset.id = s.id;
  const name = $<HTMLInputElement>('[data-k=name]', row);
  name.value = s.name;
  name.setAttribute('aria-label', `Fach ${i + 1}`);
  $<HTMLInputElement>('[data-k=lk]', row).checked = s.lk;
  row.querySelectorAll<HTMLInputElement>('[data-k=hj]').forEach((el) => {
    const v = s.hj[+el.dataset.i!];
    el.value = v === null ? '' : String(v);
    el.name = `${s.id}-hj${el.dataset.i}`;
  });
  $('[data-k=remove]', row).setAttribute('aria-label', `Fach ${s.name || i + 1} entfernen`);
  return row;
}
function renderSubjects() {
  subjBox.replaceChildren(...state.subjects.map(subjectRow));
}
function renderExams() {
  examBox.replaceChildren(...state.exams.slice(0, state.examCount).map((e, i) => {
    const row = tplE.content.firstElementChild!.cloneNode(true) as HTMLElement;
    row.dataset.i = String(i);
    $('[data-k=label]', row).textContent = `${i + 1}. Prüfungsfach`;
    $('[data-k=name-lbl]', row).textContent = `Name ${i + 1}. Prüfungsfach`;
    $('[data-k=p-lbl]', row).textContent = `Punkte ${i + 1}. Prüfungsfach`;
    $<HTMLInputElement>('[data-k=name]', row).value = e.name;
    $<HTMLInputElement>('[data-k=lk]', row).checked = e.lk;
    $<HTMLInputElement>('[data-k=p]', row).value = e.p === null ? '' : String(e.p);
    return row;
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.count! === state.examCount)));
}

/** Marks out-of-range input (e.g. 16 or 7.5) and returns the parsed points. */
function readPoints(el: HTMLInputElement) {
  const v = points(el.value);
  const bad = el.value !== '' && v === null;
  if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  return v;
}

subjBox.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  const s = state.subjects.find((x) => x.id === el.closest<HTMLElement>('.abi-row')?.dataset.id);
  if (!s) return;
  if (el.dataset.k === 'name') s.name = el.value;
  else if (el.dataset.k === 'lk') s.lk = el.checked;
  else if (el.dataset.k === 'hj') s.hj[+el.dataset.i!] = readPoints(el);
  refresh();
});
subjBox.addEventListener('click', (ev) => {
  const btn = (ev.target as Element).closest('[data-k=remove]');
  if (!btn) return;
  const id = btn.closest<HTMLElement>('.abi-row')!.dataset.id;
  const i = state.subjects.findIndex((x) => x.id === id);
  state.subjects.splice(i, 1);
  if (!state.subjects.length) state.subjects.push(newSubject());
  renderSubjects();
  refresh();
  const rows = subjBox.querySelectorAll<HTMLElement>('.abi-row');
  $<HTMLInputElement>('[data-k=name]', rows[Math.min(i, rows.length - 1)]).focus();
  say('Fach entfernt.');
});
examBox.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  const e = state.exams[+el.closest<HTMLElement>('.exam-row')!.dataset.i!];
  if (el.dataset.k === 'name') e.name = el.value;
  else if (el.dataset.k === 'lk') e.lk = el.checked;
  else if (el.dataset.k === 'p') e.p = readPoints(el);
  refresh();
});
document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((b) => b.addEventListener('click', () => {
  state.examCount = +b.dataset.count! === 4 ? 4 : 5;
  renderExams();
  refresh();
}));

$('[data-action=add]').addEventListener('click', () => {
  state.subjects.push(newSubject());
  renderSubjects();
  refresh();
  const rows = subjBox.querySelectorAll('.abi-row');
  $<HTMLInputElement>('[data-k=name]', rows[rows.length - 1]).focus();
});
$('[data-action=reset]').addEventListener('click', () => {
  if (!confirm('Alle Fächer und Punkte löschen?')) return;
  state = fresh();
  renderAll();
  say('Alle Punkte gelöscht.');
});
$('[data-action=sample]').addEventListener('click', () => {
  const names = ['Mathematik', 'Englisch', 'Deutsch', 'Geschichte', 'Biologie', 'Physik', 'Französisch', 'Kunst', 'Religion', 'Erdkunde'];
  const pts = [[13, 12, 14, 13], [11, 12, 12, 13], [10, 11, 10, 12], [12, 11, 13, 12], [9, 10, 11, 10], [8, 9, 10, 9], [11, 10, 10, 11], [14, 13, 14, 15], [12, 12, 13, 12], [10, 9, 11, 10]];
  state = {
    subjects: names.map((name, i) => newSubject({ name, lk: i < 2, hj: [...pts[i]] })),
    exams: state.exams.map((e, i) => ({ ...e, name: ['Mathematik', 'Englisch', 'Deutsch', 'Geschichte', 'Biologie'][i], lk: i < 2, p: [12, 13, 10, 11, 9][i] })),
    examCount: 5,
  };
  renderAll();
  say('Beispielpunkte geladen.');
});

/* ---------- results ---------- */
const gradeEl = $('[data-grade]');
let shownGrade: number | null = null;
/* Note ⇄ US-GPA view */
let view: 'de' | 'us' = 'de';
try { if (localStorage.getItem('abi-view') === 'us') view = 'us'; } catch {}
function syncView() {
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('[data-us-note]').hidden = view !== 'us';
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => {
  view = b.dataset.view === 'us' ? 'us' : 'de';
  try { localStorage.setItem('abi-view', view); } catch {}
  syncView();
  shownGrade = null;
  refresh(false);
}));

function setGrade(g: number | null) {
  if (view === 'us') { shownGrade = null; gradeEl.textContent = g === null ? '–' : germanToUs(g).toFixed(2); return; }
  const from = shownGrade;
  shownGrade = g;
  if (g === null || from === null || reduced || from === g) { gradeEl.textContent = g === null ? '–' : de(g); return; }
  const o = { n: from };
  gsap.to(o, { n: g, duration: 0.6, ease: 'power3.out', overwrite: true, onUpdate: () => (gradeEl.textContent = de(o.n)), onComplete: () => (gradeEl.textContent = de(g)) });
}
function setBar(el: HTMLElement, frac: number) {
  const w = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  if (reduced) el.style.width = w; else gsap.to(el, { width: w, duration: 0.5, ease: 'power2.out', overwrite: true });
}

let wasTop = false;
/** One-shot confetti the first time the grade reaches 1,0. */
function celebrate(g: number | null) {
  const top = g === 1;
  if (top && !wasTop && !reduced) {
    const r = gradeEl.getBoundingClientRect();
    import('canvas-confetti').then(({ default: confetti }) => confetti({
      particleCount: 40, spread: 70, startVelocity: 24, ticks: 110, gravity: 1.1, scalar: 0.8,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
      colors: ['#0070f3', '#171717', '#50e3c2'], disableForReducedMotion: true,
    }));
  }
  wasTop = top;
}

let liveTimer = 0;
function refresh(persist = true) {
  if (persist) save();
  const r = result(state);
  setGrade(r.grade);
  celebrate(r.grade);
  $('[data-total]').textContent = r.total !== null && r.grade !== null && view === 'us'
    ? `US-GPA · Note ${de(r.grade)}`
    : r.total === null
    ? (r.b1.points === null ? 'Trage Punkte ein' : 'Prüfungspunkte fehlen')
    : `${r.total} von ${MAX_TOTAL} Punkten`;
  $('[data-b1]').textContent = `${r.b1.points ?? '–'} / 600`;
  $('[data-b2]').textContent = `${r.b2.points ?? '–'} / 300${r.b2.points !== null && !r.b2.complete ? ' (unvollständig)' : ''}`;
  setBar($('[data-bar1]'), (r.b1.points ?? 0) / 600);
  setBar($('[data-bar2]'), (r.b2.points ?? 0) / 300);
  const next = r.total === null ? null : nextStep(r.total);
  $('[data-next]').textContent = r.total === null ? ''
    : r.grade === null ? `Noch ${300 - r.total} Punkte bis zum Bestehen (300).`
    : next ? `Noch ${next.need} ${next.need === 1 ? 'Punkt' : 'Punkte'} bis zur ${de(next.grade)}.`
    : 'Bestnote erreicht!';
  $('[data-status]').textContent = r.passed === true ? 'Bestanden ✓' : r.passed === false ? 'Nicht bestanden' : 'Bestehensregeln';
  $('#checks').replaceChildren(...r.checks.map((c) => {
    const li = document.createElement('li');
    li.className = 'check';
    li.dataset.ok = String(c.ok);
    li.innerHTML = `<span aria-hidden="true">${c.ok === true ? '✓' : c.ok === false ? '✗' : '○'}</span>`;
    const t = document.createElement('span');
    t.textContent = c.label;
    li.append(t, Object.assign(document.createElement('span'), { className: 'sr-only', textContent: c.ok === true ? ' (erfüllt)' : c.ok === false ? ' (nicht erfüllt)' : ' (offen)' }));
    return li;
  }));
  clearTimeout(liveTimer);
  liveTimer = window.setTimeout(() => {
    live.textContent = r.grade !== null ? `Abiturschnitt ${de(r.grade)}, ${r.total} von 900 Punkten.` : '';
  }, 800);
}

function renderAll() {
  renderSubjects();
  renderExams();
  refresh();
}

syncView();
renderAll();
if (!reduced) gsap.from('[data-reveal]', { opacity: 0, y: 12, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
if (!storageOk) say('Speichern ist in diesem Browser nicht möglich.');
