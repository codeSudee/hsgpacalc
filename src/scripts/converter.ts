import { germanToUsExact, usToGerman, US_PASS } from './convert';

const T = JSON.parse(document.getElementById('conv-i18n')!.textContent!) as Record<string, string>;
const root = document.querySelector<HTMLElement>('[data-conv]')!;
const $ = <E extends Element = HTMLElement>(s: string) => root.querySelector(s) as E;
const input = $<HTMLInputElement>('[data-in]');
const deNum = (n: number) => n.toFixed(1).replace('.', ',');

type Dir = 'de-us' | 'us-de';
let dir: Dir = 'de-us';
/** After a swap the input shows a rounded GPA; convert from the exact value so 1,8 → 3.47 → 1,8 round-trips. */
let carried: { text: string; value: number } | null = null;

/** Accepts "2,3" and "2.3". */
function parse(v: string): number | null {
  const s = v.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function render() {
  const fromDe = dir === 'de-us';
  $('[data-from]').textContent = fromDe ? T.de : T.us;
  $('[data-to]').textContent = fromDe ? T.us : T.de;
  $('[data-in-label]').textContent = `${T.input} (${fromDe ? T.de : T.us})`;
  $('[data-out-label]').textContent = `${T.result}: ${fromDe ? T.us : T.de}`;
  $('[data-hint]').textContent = fromDe ? T.hintDe : T.hintUs;
  input.placeholder = fromDe ? T.phDe : T.phUs;

  const out = $('[data-out]'), msg = $('[data-msg]');
  const raw = input.value.trim();
  const n = carried && raw === carried.text ? carried.value : raw ? parse(raw) : null;
  const valid = n !== null && (fromDe ? n >= 1 && n <= 6 : n >= 0 && n <= 5);
  if (raw && !valid) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  if (!raw || !valid) {
    out.textContent = '–';
    msg.textContent = raw ? (fromDe ? T.invalidDe : T.invalidUs) : T.empty;
    return;
  }
  if (fromDe) {
    out.textContent = germanToUsExact(n!).toFixed(2);
    msg.textContent = n! > 4 ? T.failDe : '';
  } else {
    out.textContent = deNum(usToGerman(n!));
    msg.textContent = n! > 4 ? T.topUs : n! < US_PASS ? T.failUs : '';
  }
}

input.addEventListener('input', render);
$('[data-swap]').addEventListener('click', () => {
  // Carry the current result over as the new input.
  const out = $('[data-out]').textContent!;
  const raw = input.value.trim();
  const n = carried && raw === carried.text ? carried.value : parse(raw);
  carried = null;
  if (out !== '–' && n !== null) {
    input.value = out;
    if (dir === 'de-us') carried = { text: out, value: germanToUsExact(n) };
  }
  dir = dir === 'de-us' ? 'us-de' : 'de-us';
  render();
  input.focus();
});
// Reference-table rows and example chips fill the input: <button data-fill="2,3" data-fill-dir="de-us">
document.querySelectorAll<HTMLElement>('[data-fill]').forEach((b) => b.addEventListener('click', () => {
  dir = (b.dataset.fillDir as Dir) ?? 'de-us';
  carried = null;
  input.value = b.dataset.fill!;
  render();
  root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
}));
render();
