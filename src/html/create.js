import { $id, specEl } from '../dom.js';
import { jumpToLine } from './editor.js';
import { ASSERTIONS, validate } from './parse.js';
import { lineRow, listGroup, listNote } from '../lists.js';
import { preview } from './run.js';
import { exampleCache, exampleTests, persist, stashEditor, testsFor } from './sites.js';
import { editorSite } from '../state.js';
import { band, plural } from '../util.js';

/* ---------- Create: write the example's tests yourself ----------

   Every other mode hands you a file that already works and asks a question
   about it. This one takes the file away. The editor starts as nothing but the
   titles of the tests the example ships, written as comments, and the panel
   says how many of them are still yours to write.

   The titles are the whole brief, and that is deliberate: "Shows an error for a
   missing ZIP" says what the test must prove without saying which control to
   click, which is the part worth working out. The example's real tests are
   still there — they are what every other mode is reading — so the answer is
   one mode away rather than hidden, and the panel's job is to say how far you
   have got, not to grade you.

   A test is done when it carries the example's title **exactly** and makes the
   same checks the example's own test makes: every expectText, expectNoText and
   expectVisible in the original has to be in yours too. The title says which
   brief you answered and the checks say you answered it — the steps that get
   you there are yours to work out, and there is usually more than one way, but
   what the test proves is not negotiable. Checks inherited from beforeEach
   count on neither side, for the same reason they do not count in the Unknown
   Test smell: they are not what this test claims.

   It is the one mode that changes what the editor holds, so it keeps a file per
   site of its own (`createTests` in html/sites.js) and gives the other one back on
   the way out.                                                                */

// The titles an example ships, in file order — except the titles of tests that
// check nothing. A brief is "prove this", and a test with no check of its own
// proves nothing, so there is nothing to ask for and no way to mark it done.
// The Smells tab has a name for those: they are Unknown Tests, and the handful the
// examples ship on purpose are there to be looked at rather than copied.
export function titlesOf(text){
  const v = validate(text);
  if (v.spec) return v.spec.tests.filter(t => checksOf(t).length).map(t => t.title);
  // A file this app wrote always parses; reading the titles off the lines is
  // what is left if one ever does not.
  return text.split('\n').filter(l => /^test\s*:/.test(l)).map(l => l.replace(/^test\s*:\s*/, '').trim().replace(/^["'](.*)["']$/, '$1'));
}
// What a check claims, as one string, so two of them can be compared. Text is
// what the two text checks claim; for expectVisible it is the element.
const checkKey = s => (s.action === 'expectVisible'
  ? `expectVisible ${JSON.stringify(Object.entries(s.target || {}).sort())}`
  : `${s.action} ${s.text}`);
// The checks a test makes on its own behalf. beforeEach runs inside every test,
// so the parser folds it in; what this test claims is what it says itself.
export const checksOf = t => (t ? t.steps.filter(st => st.from !== 'beforeEach' && ASSERTIONS.has(st.action)).map(checkKey) : []);

// The file Create starts you on: the titles, as comments, and nothing else.
export async function createSkeleton(site = editorSite){
  const titles = titlesOf(await exampleTests(site));
  return titles.map(t => `# ${t}`).join('\n\n') + (titles.length ? '\n' : '');
}

/* ---------- Coming and going ---------- */
// Each side saves what it holds before the other loads, so a change of mode
// never costs anybody a line.
export async function enterCreate(from){
  stashEditor(editorSite, from);
  specEl.value = await testsFor(editorSite, 'create') ?? await createSkeleton(editorSite);
  afterSwap();
}
export async function leaveCreate(){
  stashEditor(editorSite, 'create');
  specEl.value = await testsFor(editorSite);
  afterSwap();
}
// The editor changed under everything that reads it, and preview() is what
// re-reads it.
function afterSwap(){ persist(); preview(); }

/* ---------- How far you have got ---------- */
export function report(text = specEl.value, site = editorSite){
  const shipped = validate(exampleCacheText(site));
  const originals = new Map((shipped.spec ? shipped.spec.tests : []).map(t => [t.title.trim(), t]));
  const titles = titlesOf(exampleCacheText(site));
  const v = validate(text);
  const written = new Map((v.spec ? v.spec.tests : []).map(t => [t.title.trim(), t]));
  const lines = text.split('\n');
  const items = titles.map(title => {
    const t = written.get(title.trim());
    const wanted = checksOf(originals.get(title.trim()));
    const mine = new Set(checksOf(t));
    // Every check the example's own test makes has to be in yours. An example
    // whose test checks nothing could not ask for one, so any check will do.
    const matches = !!t && (wanted.length ? wanted.every(k => mine.has(k)) : mine.size > 0);
    return {
      title,
      state: !t ? 'todo' : matches ? 'done' : 'nocheck',
      steps: t ? t.steps.length : 0,
      // Where to go to work on it: the test if it is written, its comment if not
      line: lineOf(lines, title, !!t)
    };
  });
  const n = s => items.filter(i => i.state === s).length;
  const done = n('done');
  return {
    site, items, total: titles.length,
    done, nocheck: n('nocheck'), todo: n('todo'),
    score: titles.length ? done / titles.length : 0
  };
}
// exampleTests is async and this runs on every keystroke, so the panel reads the
// cache that the first render filled. A site whose file has not landed yet
// reports nothing, and the render that follows the fetch fills it in.
const exampleCacheText = site => exampleCache[site] ?? '';

function lineOf(lines, title, done){
  const t = title.trim();
  const i = lines.findIndex(l => (done ? /^test\s*:/.test(l) : /^\s*#/.test(l))
    && l.replace(/^test\s*:\s*|^\s*#\s?/, '').trim().replace(/^["'](.*)["']$/, '$1') === t);
  return i;
}

/* ---------- The panel ---------- */
export const createEl = $id('create'), createScore = $id('createScore');
const createPanel = createEl.closest('.panel');
const foldCreateBtn = $id('foldCreate');
const GROUPS = [
  ['todo', 'TODO', 'No test with this title yet'],
  ['nocheck', 'DOING', 'Missing some of the original checks'],
  ['done', 'DONE', 'Checks what the original checks']
];

export function renderCreate(){
  const r = report();
  // The example's tests are fetched; until they land there is nothing to be
  // part of the way through.
  if (!r.total){
    exampleTests(editorSite).then(() => { if (r.site === editorSite) renderCreate(); });
    createPanel.dataset.band = '';
    createScore.textContent = '';
    createEl.innerHTML = '';
    createEl.appendChild(listNote('Reading this example’s tests…'));
    return;
  }
  const pct = Math.round(r.score * 100);
  createPanel.dataset.band = band(pct);
  createScore.textContent = r.done === r.total
    ? `All ${plural(r.total, 'test')} written`
    : `${r.done} of ${r.total} done`;

  const top = createEl.scrollTop;
  createEl.innerHTML = '';
  // No standing advice above the list: the group a title is in says what is
  // missing, and the list is what the panel is for.
  for (const [state, title, why] of GROUPS){
    const rows = r.items.filter(i => i.state === state);
    if (!rows.length) continue;
    const g = listGroup('create', { state, title, n: rows.length, why });
    for (const i of rows) g.lastChild.appendChild(row(i));
    createEl.appendChild(g);
  }
  createEl.scrollTop = top;
}
// What is missing is the group's name, so the row says only how far it is
const row = i => lineRow('create', { what: i.title, detail: i.state === 'todo' ? '' : plural(i.steps, 'step'),
  go: i.line >= 0 && (() => jumpToLine(i.line)), title: i.state === 'todo' ? 'Go to its comment' : 'Go to the test', label: `Go to ${i.title}` });

/* ---------- Folding ---------- */
let folded = false;
export function setCreateFolded(f){
  folded = f;
  createEl.hidden = f;
  $id('left').dataset.create = f ? 'collapsed' : 'open';
  foldCreateBtn.setAttribute('aria-expanded', String(!f));
  foldCreateBtn.setAttribute('aria-label', f ? 'Expand the list' : 'Collapse the list');
  foldCreateBtn.title = f ? 'Show tests' : 'Hide tests';
  $id('foldCreateIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
foldCreateBtn.addEventListener('click', () => setCreateFolded(!folded));
setCreateFolded(false);
