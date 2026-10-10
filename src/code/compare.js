import { $id } from '../dom.js';
import { plural } from '../util.js';
import { LOGOS } from './logos.js';
import { diffLines, markHtml } from './diff.js';
import { CODE_MODES, LANGS, S, active, exampleOf, key, sessions, testsEd } from './core.js';

/* ---------- The tests, large, and another framework's beside them ----------
   The Tests panel's Open large shows the file on screen alone, read-only, in a
   dialog. Compare puts beside it the same example's tests in another
   framework or language: by default the other framework of the same language
   (pytest and unittest, Jasmine and Mocha). Each side has the Tests panel's
   own switches, and changing them changes only what that side shows, never the
   editor. What a side shows is what that file's editor would hold: your edits
   to it if you made some, the example's otherwise. While both sides show,
   the second side's Diff check marks on both what the other lacks
   (code/diff.js). */

const same = (a, b) => a.mode === b.mode && a.lang === b.lang && a.fw === b.fw;
const current = () => ({ mode: active, lang: S().lang, fw: S().framework });
const langOf = c => LANGS.find(l => l.mode === c.mode && (l.lang ?? null) === c.lang);
const fwOf = c => CODE_MODES[c.mode].frameworks.find(f => f.id === c.fw);
// The other framework of the same language
const sibling = c => ({ ...c, fw: CODE_MODES[c.mode].frameworks.find(f => f.id !== c.fw)?.id ?? c.fw });

const dlg = $id('cmp'), compareBtn = $id('cmpCompare'), diffBox = $id('cmpDiff'), actions = dlg.querySelector('.cmp-actions');
// What each side shows, and its text once loaded (null if it did not load)
const panes = [$id('cmpMine'), $id('cmpOther')].map(el => ({ el, shows: null, text: undefined }));
const comparing = () => compareBtn.getAttribute('aria-pressed') === 'true';

const fetched = new Map();
async function textOf(c, id){
  if (same(c, current())) return testsEd.value;          // what the editor holds, Create's included
  const edited = sessions[c.mode]?.edits.get(key({ id, lang: c.lang, framework: c.fw }, 'tests'));
  if (edited != null) return edited;
  const file = CODE_MODES[c.mode].files(id, c.fw, c.lang ?? undefined).tests;
  const url = new URL(`../../examples/${c.mode}/${id}/${c.fw}/${file}`, import.meta.url).href;
  if (!fetched.has(url)) fetched.set(url, fetch(url).then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status)))));
  return fetched.get(url).catch(() => { fetched.delete(url); return null; });
}

// The Tests panel's switches, as code/code.js draws them: the languages by
// their logos alone, the frameworks by logo and name
function button(it, pressed, logoOnly){
  const b = document.createElement('button');
  b.type = 'button'; b.title = it.title;
  b.setAttribute('aria-pressed', String(pressed));
  b.innerHTML = LOGOS[it.logo] || '';
  if (logoOnly) b.setAttribute('aria-label', it.label);
  else b.append(Object.assign(document.createElement('span'), { textContent: it.label }));
  return b;
}
function drawSwitches(pane){
  const c = pane.shows, langs = pane.el.querySelector('.cmp-lang'), fws = pane.el.querySelector('.cmp-fw');
  langs.replaceChildren(...LANGS.map(l => {
    const b = button(l, l === langOf(c), true);
    b.dataset.lang = l.id;
    // Another language keeps the framework where it has it (Jasmine in JS and TS), its first otherwise
    b.addEventListener('click', () => {
      const fw = CODE_MODES[l.mode].frameworks.some(f => f.id === c.fw) ? c.fw : CODE_MODES[l.mode].frameworks[0].id;
      show(pane, { mode: l.mode, lang: l.lang ?? null, fw });
    });
    return b;
  }));
  fws.replaceChildren(...CODE_MODES[c.mode].frameworks.map(f => {
    const b = button(f, f.id === c.fw, false);
    b.dataset.fw = f.id;
    b.addEventListener('click', () => show(pane, { ...c, fw: f.id }));
    return b;
  }));
}
async function show(pane, c){
  pane.shows = c;
  drawSwitches(pane);
  const id = exampleOf(active), code = pane.el.querySelector('.cmp-code');
  const file = CODE_MODES[c.mode].files(id, c.fw, c.lang ?? undefined).tests, count = pane.el.querySelector('.cmp-count');
  Object.assign(pane.el.querySelector('.code-file'), { textContent: file, title: file });
  count.textContent = '';
  pane.text = undefined;
  code.setAttribute('aria-label', `Tests in ${langOf(c).label} with ${fwOf(c).label}`);
  const text = await textOf(c, id);
  if (pane.shows !== c || !dlg.open) return;          // another was chosen meanwhile
  const n = text == null ? 0 : CODE_MODES[c.mode].testsIn(text, file, c.fw).length;
  count.textContent = n ? plural(n, 'test') : 'No tests';
  pane.text = text;
  if (comparing()) panes.forEach(draw);
  else draw(pane);
  code.scrollTop = 0;
}
// A side's code, with what differs marked while both sides show and Diff is checked
function draw(pane){
  const code = pane.el.querySelector('.cmp-code'), { text, shows } = pane;
  if (text === undefined) return;
  if (text === null){
    code.innerHTML = '<span class="cmp-none">These tests did not load. Close and try again.</span>';
    return;
  }
  const [a, b] = panes;
  const marks = comparing() && diffBox.checked && typeof a.text === 'string' && typeof b.text === 'string'
    ? diffLines(a.text, b.text)[pane === a ? 0 : 1] : [];
  code.innerHTML = CODE_MODES[shows.mode].highlight(text).map((l, i) => {
    const m = marks[i];
    if (!m) return `<span class="l">${l || ' '}</span>`;
    return `<span class="l diff">${m === true ? l : markHtml(l, m)}</span>`;
  }).join('');
}
function setComparing(on){
  compareBtn.setAttribute('aria-pressed', String(on));
  panes[1].el.hidden = !on;
  dlg.classList.toggle('comparing', on);
  // Compare and Close end the head of the last side showing
  panes[on ? 1 : 0].el.querySelector('.cmp-head').append(actions);
  if (on) show(panes[1], sibling(panes[0].shows));
  else draw(panes[0]);
}
export function openTests(){
  dlg.showModal();
  show(panes[0], current());
  setComparing(false);
}
compareBtn.addEventListener('click', () => setComparing(!comparing()));
diffBox.addEventListener('change', () => panes.forEach(draw));
$id('cmpClose').addEventListener('click', () => dlg.close());
// A click on the backdrop closes it, as Escape does
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$id('codeTestsOpen').addEventListener('click', openTests);
