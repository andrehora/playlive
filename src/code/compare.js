import { hasFramework } from '../../examples/code.js';
import { $id } from '../dom.js';
import { plural } from '../util.js';
import { LOGOS } from './logos.js';
import { diffLines, markHtml } from './diff.js';
import { apisOf, luckyUrl } from './apis.js';
import { anchorsOf, mapLine, pairTests, testSpans } from './pair.js';
import { differs, termsIn, used } from './terms.js';
import { CODE_MODES, LANGS, NEW, S, active, exampleOf, key, sessions, testsEd } from './core.js';

/* ---------- The tests, large, and another framework's beside them ----------
   The Tests panel's Open large shows the file on screen alone, read-only, in a
   dialog. Compare puts beside it the same example's tests in another
   framework or language: by default the other framework of the same language
   (pytest and unittest, Jasmine and Mocha). Each side has the Tests panel's
   own switches, and changing them changes only what that side shows, never the
   editor. What a side shows is what that file's editor would hold: your edits
   to it if you made some, the example's otherwise. While both sides show,
   the second side's Diff check marks on both what the other lacks
   (code/diff.js). While both sides show they also keep level: pointing at a
   test, or focusing it, lights it and the same test on the other side and
   brings that one beside it, and scrolling either side scrolls the other by
   the same tests (code/pair.js), and under each head a line names what that
   side writes for each part of a test and the other does not; alone, all the
   framework's names it uses. Each name links to its documentation
   (code/terms.js, code/apis.js).
   Swap trades the two sides. Alone, the side's head holds the app bar's own
   example picker, arrows and all, so another example is chosen as at home;
   Compare and Close give it back. */

const same = (a, b) => a.mode === b.mode && a.lang === b.lang && a.fw === b.fw;
const current = () => ({ mode: active, lang: S().lang, fw: S().framework });
const langOf = c => LANGS.find(l => l.mode === c.mode && (l.lang ?? null) === c.lang);
const fwOf = c => CODE_MODES[c.mode].frameworks.find(f => f.id === c.fw);
// The other framework of the same language
const sibling = c => ({ ...c, fw: CODE_MODES[c.mode].frameworks.find(f => f.id !== c.fw)?.id ?? c.fw });

const dlg = $id('cmp'), compareBtn = $id('cmpCompare'), diffBox = $id('cmpDiff'), actions = dlg.querySelector('.cmp-actions');
// The app bar's picker, lent to the head while one side shows, and where it goes back to
const picker = document.querySelector('.appbar .picker'), home = document.createComment('picker');
picker.before(home);
// What each side shows, and its text once loaded (null if it did not load)
const panes = [$id('cmpMine'), $id('cmpOther')].map(el => ({ el, shows: null, text: undefined, spans: [], setTop: null, pointerY: null }));
const comparing = () => compareBtn.getAttribute('aria-pressed') === 'true';

const fetched = new Map();
async function textOf(c, id){
  // What the editor holds, Create's included, once it holds this example: a
  // newly picked one is still loading when the dialog asks
  const shown = S().shown;
  if (shown?.id === id && same(c, { mode: active, lang: shown.lang, fw: shown.framework })) return testsEd.value;
  const edited = sessions[c.mode]?.edits.get(key({ id, lang: c.lang, framework: c.fw }, 'tests'));
  if (edited != null) return edited;
  if (id === NEW) return '';
  if (!hasFramework(id, c.fw)) return null;
  const file = CODE_MODES[c.mode].files(id, c.fw, c.lang ?? undefined).tests;
  const url = new URL(`../../examples/${c.mode}/${id}/${c.fw}/${file}`, import.meta.url).href;
  if (!fetched.has(url)) fetched.set(url, fetch(url).then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status)))));
  return fetched.get(url).catch(() => { fetched.delete(url); return null; });
}

// The Tests panel's switches, as code/code.js draws them: the languages by
// their logos alone, the frameworks by logo and name
function button(it, pressed, logoOnly, has = true){
  const b = document.createElement('button');
  b.type = 'button'; b.title = has ? it.title : `Not written for ${it.label}`;
  b.disabled = !has;
  b.setAttribute('aria-pressed', String(pressed));
  b.innerHTML = LOGOS[it.logo] || '';
  if (logoOnly) b.setAttribute('aria-label', it.label);
  else b.append(Object.assign(document.createElement('span'), { textContent: it.label }));
  return b;
}
function drawSwitches(pane){
  const c = pane.shows, langs = pane.el.querySelector('.cmp-lang'), fws = pane.el.querySelector('.cmp-fw');
  const id = exampleOf(active), has = fw => id === NEW || hasFramework(id, fw);
  langs.replaceChildren(...LANGS.map(l => {
    const b = button(l, l === langOf(c), true, CODE_MODES[l.mode].frameworks.some(f => has(f.id)));
    b.dataset.lang = l.id;
    // Another language keeps the framework where it has it (Jasmine in JS and TS), its first otherwise
    b.addEventListener('click', () => {
      const fw = CODE_MODES[l.mode].frameworks.some(f => f.id === c.fw) ? c.fw : CODE_MODES[l.mode].frameworks.find(f => has(f.id)).id;
      show(pane, { mode: l.mode, lang: l.lang ?? null, fw });
    });
    return b;
  }));
  fws.replaceChildren(...CODE_MODES[c.mode].frameworks.map(f => {
    const b = button(f, f.id === c.fw, false, has(f.id));
    b.dataset.fw = f.id;
    b.addEventListener('click', () => show(pane, { ...c, fw: f.id }));
    return b;
  }));
}
async function show(pane, c){
  pane.shows = c;
  drawSwitches(pane);
  const id = exampleOf(active), code = pane.el.querySelector('.cmp-code');
  // Only the first side names its file and counts its tests
  const file = CODE_MODES[c.mode].files(id, c.fw, c.lang ?? undefined).tests, count = pane.el.querySelector('.cmp-count');
  const name = pane.el.querySelector('.code-file');
  if (name) Object.assign(name, { textContent: file, title: file });
  if (count) count.textContent = '';
  pane.text = undefined;
  code.setAttribute('aria-label', `Tests in ${langOf(c).label} with ${fwOf(c).label}`);
  const text = await textOf(c, id);
  if (pane.shows !== c || !dlg.open) return;          // another was chosen meanwhile
  if (count){
    const n = text == null ? 0 : CODE_MODES[c.mode].testsIn(text, file, c.fw).length;
    count.textContent = n ? plural(n, 'test') : 'No tests';
  }
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
    const id = exampleOf(active);
    code.innerHTML = '<span class="cmp-none"></span>';
    code.firstChild.textContent = id === NEW || hasFramework(id, shows.fw)
      ? 'These tests did not load. Close and try again.'
      : `This example has no ${fwOf(shows).label} tests. Pick another framework above.`;
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
  relate();
}

/* ---------- Keeping the two sides level ---------- */
let pairs = [], anchors = [[0, 0]], lit = [-1, -1];
const codeOf = pane => pane.el.querySelector('.cmp-code');
const sideOf = pane => (pane === panes[0] ? 0 : 1);
const other = pane => panes[1 - sideOf(pane)];

// Which tests are the same, once both sides have loaded; a key reaches each test's first line
function relate(){
  lit = [-1, -1];
  tell([]);
  pairs = []; anchors = [[0, 0]];
  panes.forEach(p => { p.spans = []; });
  const snippets = p => CODE_MODES[p.shows.mode].snippets(p.shows.fw, p.shows.lang ?? undefined);
  if (!comparing()){
    if (typeof panes[0].text === 'string') tell(used(termsIn(panes[0].text, snippets(panes[0]))));
    return;
  }
  if (!panes.every(p => typeof p.text === 'string')) return;
  panes.forEach(p => {
    const c = CODE_MODES[p.shows.mode], file = c.files(exampleOf(active), p.shows.fw, p.shows.lang ?? undefined).tests;
    p.spans = testSpans(p.text, c.testsIn(p.text, file, p.shows.fw));
    const lines = codeOf(p).children;
    p.spans.forEach(s => lines[s.start]?.setAttribute('tabindex', '0'));
  });
  const [a, b] = panes;
  pairs = pairTests(a.spans, b.spans);
  anchors = anchorsOf(a.spans, b.spans, pairs, a.text.split('\n').length, b.text.split('\n').length);
  tell(differs(termsIn(a.text, snippets(a)), termsIn(b.text, snippets(b))));
}
// Each side's line of names, each linked to a search on its documentation
function tell(rows){
  panes.forEach((p, k) => {
    const el = p.el.querySelector('.cmp-terms');
    el.hidden = !rows.length || (k && !comparing());
    if (el.hidden) return el.replaceChildren();
    const apis = p.shows && apisOf(CODE_MODES[p.shows.mode].snippets(p.shows.fw, p.shows.lang ?? undefined), p.shows.fw);
    el.replaceChildren(...rows.flatMap(({ role, a, b }, i) => {
      const part = document.createElement('span');
      part.className = 'cmp-part';
      part.append(Object.assign(document.createElement('span'), { className: 'cmp-role', textContent: role }));
      for (const name of k ? b : a){
        const api = apis.get(name.split(' ')[0].split('.').at(-1));
        const n = api ? Object.assign(document.createElement('a'), { className: 'api', href: luckyUrl(api.query), target: '_blank', rel: 'noopener', title: `Look up ${name}` })
          : document.createElement('span');
        n.textContent = name;
        part.append(' ', n);
      }
      return i ? [' · ', part] : [part];
    }));
  });
}
// Lights test i of one side and the same test j of the other (-1 for none)
function light(side, i){
  const p = pairs.find(x => x[side] === i), j = p ? p[1 - side] : -1, next = side ? [j, i] : [i, j];
  if (next[0] === lit[0] && next[1] === lit[1]) return false;
  lit = next;
  panes.forEach((pane, k) => {
    const lines = codeOf(pane).children, s = pane.spans[lit[k]];
    for (const l of lines) l.classList.remove('pair');
    if (s) for (let n = s.start; n < s.end; n++) lines[n]?.classList.add('pair');
  });
  return j >= 0;
}
// The first line's top within the scrolled code, and a line's height
function geometry(code){
  const l = code.querySelector('.l');
  if (!l) return null;
  const r = l.getBoundingClientRect();
  return { top: r.top - code.getBoundingClientRect().top + code.scrollTop, lh: r.height };
}
// Scrolls the other side so the line y pixels down this side's view has its match level with it
function align(from, y){
  const to = other(from), a = codeOf(from), b = codeOf(to), g = geometry(a), h = geometry(b);
  if (!g || !h || !g.lh) return;
  const x = (a.scrollTop + y - g.top) / g.lh;
  const m = mapLine(sideOf(from) ? anchors.map(([p, q]) => [q, p]) : anchors, x);
  b.scrollTop = h.top + m * h.lh - y;
  to.setTop = b.scrollTop;
}
function reach(pane, line){
  const code = codeOf(pane), l = line?.closest?.('.l');
  if (!comparing() || !l || l.parentNode !== code) return;
  const n = [...code.children].indexOf(l), i = pane.spans.findIndex(s => s.start <= n && n < s.end);
  if (light(sideOf(pane), i)){
    const y = l.getBoundingClientRect().top - code.getBoundingClientRect().top + l.offsetHeight / 2;
    align(pane, y);
  }
}
panes.forEach(pane => {
  const code = codeOf(pane);
  code.addEventListener('pointerover', e => reach(pane, e.target));
  code.addEventListener('focusin', e => reach(pane, e.target));
  code.addEventListener('pointermove', e => { pane.pointerY = e.clientY - code.getBoundingClientRect().top; });
  code.addEventListener('pointerleave', () => { pane.pointerY = null; });
  code.addEventListener('scroll', () => {
    // Its own scroll, set by the other side, moves nothing back
    if (pane.setTop != null && Math.abs(code.scrollTop - pane.setTop) < 1){ pane.setTop = null; return; }
    pane.setTop = null;
    if (comparing()) align(pane, pane.pointerY ?? code.clientHeight / 2);
  });
});
dlg.querySelector('.cmp-panes').addEventListener('pointerleave', () => light(0, -1));
function setComparing(on){
  compareBtn.setAttribute('aria-pressed', String(on));
  panes[1].el.hidden = !on;
  if (on) home.after(picker);
  else panes[0].el.querySelector('h2').after(picker);
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
// A phone has no room for two sides (app.css hides Compare there), so one turned upright mid-comparison shows one
const phone = matchMedia('(max-width:600px)');
phone.addEventListener('change', () => { if (phone.matches && dlg.open && comparing()) setComparing(false); });
// An example picked in the head shows on its side, in the language and framework the side had
document.addEventListener('playlive:code-example', () => { if (dlg.open && !comparing()) show(panes[0], panes[0].shows); });
dlg.addEventListener('close', () => home.after(picker));
$id('cmpSwap').addEventListener('click', () => {
  const [a, b] = panes.map(p => p.shows);
  show(panes[0], b);
  show(panes[1], a);
});
diffBox.addEventListener('change', () => panes.forEach(draw));
$id('cmpClose').addEventListener('click', () => dlg.close());
// A click on the backdrop closes it, as Escape does
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$id('codeTestsOpen').addEventListener('click', openTests);
