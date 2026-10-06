import { SITES, SITE_IDS } from '../examples/examples.js';
import { $id, specEl } from './dom.js';
import { jumpToLine, lineForStep } from './editor.js';
import { describeStep } from './find.js';
import { ASSERTIONS, validate } from './parse.js';
import { selectSite } from './picker.js';
import { testsFor } from './sites.js';
import { editorSite } from './state.js';

/* ---------- Test smells: what is wrong with the tests themselves ----------

   Coverage asks what the tests reach and Mutation asks what they would catch.
   Both read the run. This one reads the file, because some of what makes a
   suite hard to trust is visible in the tests before anything runs: a test that
   checks nothing, a fixture that sets up more than its tests need.

   Every smell here is a *heuristic with a name*, and the name is the point: a
   student who can say "that is a General Fixture" has something to look up.
   So each one says what it looked at and what to do instead, and a row goes to
   the line it is about. Nothing is ever flagged without a line to show.

   Each is written to be quiet when it is unsure: a smell that cries wolf
   teaches people to ignore the panel.                                         */

// Two steps are the same step when they are written the same way; the file's own
// words are all this panel has, and all a reader has either.
const stepKey = s => JSON.stringify([s.action, s.value, s.text, s.ms, s.target && Object.entries(s.target).sort()]);
// What every test begins with, in order, taken from the first test because by
// definition it is the same in all of them.
function sharedOpening(tests){
  if (tests.length < 2) return [];
  const lists = tests.map(own);
  const first = lists[0];
  let n = 0;
  while (n < first.length && lists.every(l => n < l.length && stepKey(l[n]) === stepKey(first[n]))) n++;
  return first.slice(0, n);
}
// A test's own steps. beforeEach runs inside every test, so the parser folds it
// in; a smell about what *this* test does has to take it back out.
const own = t => t.steps.filter(s => s.from !== 'beforeEach');
// How many times a test stops to check: runs of checks, separated by the steps
// in between. One phase is a test proving one thing, however many checks it
// takes. Four is a test proving four, under one title.
export const EAGER = 4;
export function phasesOf(steps){
  let n = 0, inPhase = false;
  for (const s of steps){
    const check = ASSERTIONS.has(s.action);
    if (check && !inPhase) n++;
    inPhase = check;
  }
  return n;
}
// How many checks a test makes, which is not how many times it stops to check.
// Assertion Roulette is about the count: a step here carries no message of its
// own, so when one of a long row of checks goes red, the row is all there is to
// read. More than five is where that stops being readable — of the shipped
// tests the busiest makes four.
export const ROULETTE = 5;
export const checksIn = steps => steps.filter(s => ASSERTIONS.has(s.action)).length;

export const SMELLS = [
  {
    id: 'unknown-test',
    name: 'Unknown Test',
    why: 'Checks nothing. Add an expectText, expectNoText or expectVisible.'
  },
  {
    id: 'eager-test',
    name: 'Eager Test',
    why: 'Acts and checks over and over. Split it into one test per thing it proves.'
  },
  {
    id: 'assertion-roulette',
    name: 'Assertion Roulette',
    why: 'So many checks that a red one says little. Keep the checks that say what the test is for.'
  },
  {
    id: 'magic-value',
    name: 'Magic Value',
    why: 'The same value typed out in several places. Name it once under vars:.'
  },
  {
    id: 'duplication-of-setup',
    name: 'Duplication of Setup',
    why: 'Every test starts the same way. Move those steps to a beforeEach.'
  }
];

/* ---------- Finding them ---------- */
// The editor line each test's "test:" sits on, in file order. A file written as
// a legacy "tests:" list has none, and a row without a line is not offered.
function testLines(text){
  const out = [];
  text.split('\n').forEach((l, i) => { if (/^test\s*:/.test(l)) out.push(i); });
  return out;
}

// A value is what a step types or picks. Numbers in a check's text are the
// words of a message — "3 orders", "Count: 3" — and reading those as constants
// would flag every example in the catalogue, so this one stays with values.
const VALUED = new Set(['fill', 'select']);
// Every value with a number in it, and the lines it is written out on. A value
// that came from a "vars:" entry is not on its own step's line — that line says
// ${name} — so a file that has already named one has nothing to answer for.
function spelledValues(tests, text){
  const lines = text.split('\n');
  const seen = new Map();
  for (const t of tests) for (const s of t.steps){
    if (!VALUED.has(s.action) || s.value == null) continue;
    const value = String(s.value);
    if (!/\d/.test(value)) continue;
    const at = lineForStep(text, s.src);
    if (at < 0 || !lines[at].includes(value)) continue;
    if (!seen.has(value)) seen.set(value, new Set());
    seen.get(value).add(at);            // the same line twice is one place
  }
  return seen;
}

export function report(text = specEl.value){
  const v = validate(text);
  if (!v.spec) return { parsed: false, tests: 0, items: [], total: 0 };
  const tests = v.spec.tests, titleLines = testLines(text), items = [];

  // Unknown Test: nothing in the test says what should have happened. Eager
  // Test: it says it over and over, acting in between, which is several tests
  // wearing one title — and the Results row can only name the first that broke.
  // Assertion Roulette: it says far too much, in a row of checks none of which
  // explains itself, so a red one leaves you guessing which claim mattered.
  tests.forEach((t, i) => {
    const mine = own(t);
    const phases = phasesOf(mine);
    if (!phases){
      items.push({
        smell: 'unknown-test',
        what: `${t.title}`,
        detail: 'runs its steps and checks nothing',
        line: titleLines[i] ?? -1
      });
    } else if (phases >= EAGER){
      items.push({
        smell: 'eager-test',
        what: `${t.title}`,
        detail: `acts and checks ${phases} times over`,
        line: titleLines[i] ?? -1
      });
    }
    // Assertion Roulette counts the checks rather than the phases, so a test
    // can be both: one says it proves several things, this one says that when
    // it breaks, nothing in the row tells you which check was the point.
    const checks = checksIn(mine);
    if (checks > ROULETTE){
      items.push({
        smell: 'assertion-roulette',
        what: `${t.title}`,
        detail: `${checks} checks under one title`,
        line: titleLines[i] ?? -1
      });
    }
  });

  // Magic Value: the same number typed out in more than one place. Once is a
  // value; twice is a value with no name, and "vars:" is where a name goes.
  for (const [n, where] of spelledValues(tests, text)){
    if (where.size < 2) continue;
    items.push({
      smell: 'magic-value',
      what: `“${n}”`,
      detail: `written out in ${where.size} places`,
      line: Math.min(...where)
    });
  }

  // Duplication of Setup: every test opens the same way. Those steps are the
  // suite's setup written out once per test, and a beforeEach is where setup
  // goes. One test cannot share an opening with itself, so it takes two.
  for (const s of sharedOpening(tests)){
    items.push({
      smell: 'duplication-of-setup',
      what: describeStep(s),
      detail: `at the start of all ${tests.length} tests`,
      line: lineForStep(text, s.src)
    });
  }
  return { parsed: true, tests: tests.length, items, total: items.length };
}

/* ---------- Which examples have one ----------
   Smells mode narrows the example list to the ones worth opening: a hundred
   buttons where fifteen have anything to say is a worse list than fifteen. The
   scan reads each example's file the same way the panel reads the one on
   screen, so what the list promises is what the panel will show.

   It is never stored. The files are already cached by the time it has run once,
   and the site being edited is re-read on every keystroke, so the list follows
   the file you are typing into as well as the ninety-nine you are not.        */
export const smelly = new Set();
// What each example smells of, which is what the All smells tab lists. The set
// above is this map's keys: one answers "narrow the list", the other "show me".
export const found = new Map();
let scanned = false, scanning = null;
export async function scanSites(){
  if (scanning) return scanning;
  scanning = (async () => {
    await Promise.all(SITE_IDS.map(async id => {
      // The file this site would open with, whatever Create is holding for it
      const r = report((await testsFor(id, 'explore')) || '');
      record(id, r);
    }));
    scanned = true;
    scanning = null;
    document.dispatchEvent(new CustomEvent('playlive:smelly'));
    return smelly;
  })();
  return scanning;
}
export const scanDone = () => scanned;
// One example's findings, and whether it has any. Both lists are written here
// so they can never disagree about an example.
function record(id, r){
  const items = r.parsed ? r.items : [];
  found.set(id, items);
  if (items.length) smelly.add(id); else smelly.delete(id);
  return items.length > 0;
}
// The example on screen, from what is in the editor rather than what was saved.
function rescanEditor(r){
  if (!scanned) return;
  const had = smelly.has(editorSite);
  const has = record(editorSite, r);
  if (had === has) return;
  document.dispatchEvent(new CustomEvent('playlive:smelly'));
}

/* ---------- The panel ----------
   On screen in Smells mode and nowhere else, like the other two scores. It has
   no run behind it, so it redraws from the file as it is typed.

   Two tabs, because the panel answers two questions and they are not the same
   one. **This file** is what the tests on screen smell of. **All smells** is
   the catalogue: every smell the app looks for, named and explained whether or
   not anything has it, with the examples that do underneath. A student who has
   never met Eager Test should be able to find out that it exists without first
   writing one, and a row goes to the example and the line that has it, so the
   catalogue is a way into the hundred examples rather than a glossary.       */
export const smellsEl = $id('smells'), smellScore = $id('smellScore');
export const smellPanel = smellsEl.closest('.panel');
export const foldSmellsBtn = $id('foldSmells');
export const smellSeg = document.querySelector('.smell-seg');

// Which tab is showing. It is about this browser rather than the examples and
// it costs nothing to choose again, so like the catalog it is never stored.
let view = 'file';
export const smellView = () => view;
export function setSmellView(v){
  view = v === 'all' ? 'all' : 'file';
  smellSeg.querySelectorAll('button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.smellview === view)));
  renderSmells();
}
smellSeg.querySelectorAll('button').forEach(b =>
  b.addEventListener('click', () => setSmellView(b.dataset.smellview)));
// The scan is what the All smells tab lists, and it finishes after the mode has
// opened. It says so rather than being reached into from here.
document.addEventListener('playlive:smelly', () => { if (view === 'all') renderSmells(); });

export function renderSmells(){
  const r = report();
  rescanEditor(r);
  const top = smellsEl.scrollTop;
  smellsEl.innerHTML = '';
  if (view === 'all') renderAll(); else renderFile(r);
  smellsEl.scrollTop = top;
}

// What the tests on screen smell of.
function renderFile(r){
  // Nothing to say about a file that does not parse: the error box is already
  // saying the one thing that matters about it.
  smellPanel.dataset.band = !r.parsed ? '' : r.total ? 'warn' : 'ok';
  smellScore.textContent = !r.parsed ? ''
    : r.total ? `${r.total} ${r.total === 1 ? 'smell' : 'smells'} in ${r.tests} ${r.tests === 1 ? 'test' : 'tests'}`
      : `No smells in ${r.tests} ${r.tests === 1 ? 'test' : 'tests'}`;

  if (!r.parsed){
    smellsEl.appendChild(note('Fix the problems in the file first: these are read from the tests, not from a run.'));
    return;
  }
  if (!r.total){
    smellsEl.appendChild(note('Nothing to report.'));
    return;
  }
  for (const s of SMELLS){
    const rows = r.items.filter(i => i.smell === s.id);
    if (!rows.length) continue;
    const g = group(s, rows.length);
    const ul = document.createElement('ul');
    ul.className = 'cov-list';
    for (const i of rows) ul.appendChild(row(i));
    g.appendChild(ul);
    smellsEl.appendChild(g);
  }
}

// The whole catalogue, and every example that has one. The head counts the
// examples rather than the findings: this list is about where to look.
function renderAll(){
  if (!scanned && !scanning) scanSites();
  const sites = SITE_IDS.filter(id => found.get(id)?.length);
  smellPanel.dataset.band = !scanned ? '' : sites.length ? 'warn' : 'ok';
  smellScore.textContent = !scanned ? 'Reading every example…'
    : `${sites.length} of ${SITE_IDS.length} examples ${sites.length === 1 ? 'has' : 'have'} one`;

  for (const s of SMELLS){
    const rows = [];
    for (const id of SITE_IDS) for (const i of found.get(id) || []){
      if (i.smell === s.id) rows.push({ id, item: i });
    }
    const g = group(s, new Set(rows.map(x => x.id)).size);
    if (!rows.length){
      // The smell is still named and still explained: a catalogue that only
      // listed what is broken today would teach half of what it knows.
      g.dataset.none = '';
      g.appendChild(note(scanned ? 'No example has this one.' : 'Reading the examples…'));
    } else {
      const ul = document.createElement('ul');
      ul.className = 'cov-list';
      for (const x of rows) ul.appendChild(siteRow(x.id, x.item));
      g.appendChild(ul);
    }
    smellsEl.appendChild(g);
  }
}

// One smell's heading and its sentence: the name is the point, so the sentence
// that explains it is printed rather than hidden in a tooltip.
function group(s, n){
  const g = document.createElement('div');
  g.className = 'smell-group'; g.dataset.smell = s.id;
  const h = document.createElement('div');
  h.className = 'cov-head'; h.title = s.why;
  h.innerHTML = '<span class="smell-dot" aria-hidden="true"></span><span class="cov-title"></span><span class="cov-n"></span>';
  h.querySelector('.cov-title').textContent = s.name;
  h.querySelector('.cov-n').textContent = n;
  g.appendChild(h);
  const p = document.createElement('p');
  p.className = 'smell-why'; p.textContent = s.why;
  g.appendChild(p);
  return g;
}
function note(text){
  const p = document.createElement('p');
  p.className = 'cov-note'; p.textContent = text;
  return p;
}
// A row names the thing and goes to its line: a smell you cannot find is a
// complaint, not a lesson.
function row(i){
  const li = document.createElement('li');
  li.className = 'smell-row';
  const el = i.line >= 0 ? document.createElement('button') : document.createElement('div');
  el.className = 'smell-line';
  if (i.line >= 0){
    el.type = 'button';
    el.title = 'Go to the line';
    el.setAttribute('aria-label', `Go to ${i.what}`);
    el.addEventListener('click', () => jumpToLine(i.line));
  }
  el.innerHTML = '<span class="smell-what"></span><span class="smell-m"></span>';
  el.querySelector('.smell-what').textContent = i.what;
  el.querySelector('.smell-m').textContent = i.detail;
  li.appendChild(el);
  return li;
}

// A row in the catalogue names the example, not the file on screen, so it opens
// that example first and then goes to the line — the same promise the other
// rows make, kept across a hundred files.
function siteRow(id, i){
  const li = document.createElement('li');
  li.className = 'smell-row';
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'smell-line';
  el.title = `Open ${SITES[id].name} at this line`;
  el.setAttribute('aria-label', `Open ${SITES[id].name} at ${i.what}`);
  el.innerHTML = '<span class="smell-what"></span><span class="smell-m"></span>';
  el.querySelector('.smell-what').textContent = SITES[id].name;
  el.querySelector('.smell-m').textContent = i.what;
  el.addEventListener('click', async () => {
    if (id !== editorSite) await selectSite(id);
    setSmellView('file');
    if (i.line >= 0) jumpToLine(i.line);
  });
  li.appendChild(el);
  return li;
}

/* ---------- Folding: the count stays, the list goes ----------
   The same three stops the other two lists have: folded, the panel is its one
   row and Results takes the room back, rather than a blank panel staying
   behind. The layout reads the state off #left the way it reads the others. */
let folded = false;
export function setSmellFolded(f){
  folded = f;
  smellsEl.hidden = f;
  $id('left').dataset.smells = f ? 'collapsed' : 'open';
  foldSmellsBtn.setAttribute('aria-expanded', String(!f));
  foldSmellsBtn.setAttribute('aria-label', f ? 'Expand the smells' : 'Collapse the smells');
  foldSmellsBtn.title = f ? 'Show what these tests smell of' : 'Hide the list of smells';
  $id('foldSmellsIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
foldSmellsBtn.addEventListener('click', () => setSmellFolded(!folded));
setSmellFolded(false);
smellSeg.querySelectorAll('button').forEach(b =>
  b.setAttribute('aria-pressed', String(b.dataset.smellview === view)));
