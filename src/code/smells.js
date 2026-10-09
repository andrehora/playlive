import { $id } from '../dom.js';
import { boot, selectExample } from './code.js';
import { P, S, active, creating, exampleOf, key, onWorker, shipped, testsEd, view } from './core.js';
import { lineRow, listGroup, listNote } from '../lists.js';
import { plural } from '../util.js';

/* ---------- Smells: what is wrong with the tests themselves ----------
   The site modes' four smells, found in the test file by the worker, and
   shown the way the Smells panel shows them: a group per smell, its sentence,
   and a row per finding that goes to its line. Read again as the tests are
   typed; nothing runs. `smells` is { src, report } for the file it read.

   Two tabs, as in the site modes' panel: **This file** is what the tests on
   screen smell of, **All smells** every smell with the examples that have it,
   in the framework (and language) on screen. `all` is { key, found }: each
   example's report, read again each time the tab opens, and the example on
   screen followed as it is typed. Never stored. */
export const smellsEl = $id('codeSmells'), smellsBtn = document.querySelector('.code-seg [data-codetab="smells"]');
smellsEl.innerHTML = `<div class="mut-head"><div class="seg smell-seg" role="group" aria-label="What to list">
  <button type="button" data-codesmells="file" aria-pressed="true" title="Smells in these tests">This file</button>
  <button type="button" data-codesmells="all" aria-pressed="false" title="All smells">All smells</button>
  </div><span class="smell-score" aria-live="polite"></span></div><div class="code-smells"></div>`;
const smellScoreEl = smellsEl.querySelector('.smell-score'), smellList = smellsEl.querySelector('.code-smells');
export let smells = null, smellsAsked = null, smellView = 'file', all = null;
function setSmellView(v){
  smellView = v === 'all' ? 'all' : 'file';
  smellsEl.querySelectorAll('[data-codesmells]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.codesmells === smellView)));
  if (smellView === 'all') scanAll();
  renderSmells();
}
smellsEl.querySelectorAll('[data-codesmells]').forEach(b => b.addEventListener('click', () => setSmellView(b.dataset.codesmells)));
// Another example, framework or language: read again
export function resetSmells(){ smells = null; renderSmells(); listSmells(); }
export function listSmells(){
  if (!active || !P().smells || view !== 'smells' || smells?.src === testsEd.value) return;
  // A profile that reads them on the page needs no runtime for it
  if (P().smellsOf){ smellsAsked = testsEd.value; onSmells(P().smellsOf(smellsAsked)); return; }
  const s = S();
  if (!s.ready){ boot(); return; }   // asked again once it is ready
  smellsAsked = testsEd.value;
  s.worker.postMessage({ smells: true, src: smellsAsked });
}
// Every example's tests, as you left them, in the framework and language on screen
const allKey = () => `${active}/${S().framework}/${S().lang}`;
export async function scanAll(){
  if (!active || !P().smells) return;
  const s = S(), p = P(), k = allKey(), cur = exampleOf(active), create = creating;
  if (!s.ready && !p.smellsOf){ boot(); return; }   // scanned once it is ready
  if (all?.key !== k) all = { key: k, found: new Map() };
  const mine = all;
  mine.waiting = p.ids.length;
  await Promise.all(p.ids.map(async id => {
    let src;
    try {
      src = id === cur ? testsEd.value
        : s.edits.get(key({ id, lang: s.lang, framework: s.framework, create }, 'tests'))
          ?? (create ? p.skeleton(await shipped(id, 'tests'), p.files(id, s.framework, s.lang).tests) : await shipped(id, 'tests'));
    } catch { src = null; }
    if (all !== mine || (!s.ready && !p.smellsOf)) return;
    if (src == null){ mine.waiting--; return; }
    if (p.smellsOf) onSmells(p.smellsOf(src), `${k}#${id}`);
    else s.worker.postMessage({ smells: true, src, example: `${k}#${id}` });
  }));
}
let smellTimer;
testsEd.ta.addEventListener('input', () => { clearTimeout(smellTimer); smellTimer = setTimeout(listSmells, 400); });
export function onSmells(report, example){
  if (example){
    const at = example.lastIndexOf('#');
    if (all?.key !== example.slice(0, at)) return;     // read for another framework
    all.found.set(example.slice(at + 1), report);
    all.waiting--;
    if (smellView === 'all') renderSmells();
    return;
  }
  if (smellsAsked !== testsEd.value) return;   // typed since: a newer one is coming
  smells = { src: smellsAsked, report };
  // The example on screen is in the All smells list as it is now
  if (all?.key === allKey()) all.found.set(exampleOf(active), report);
  renderSmells();
}
const smellGroup = (sm, n) => listGroup('smell', { smell: sm.id, title: sm.name, n, why: sm.why, sentence: sm.why });
const smellNote = text => smellList.append(listNote(text));
export function renderSmells(){
  const top = smellsEl.scrollTop;
  smellList.innerHTML = '';
  smellScoreEl.textContent = ''; delete smellScoreEl.dataset.band;
  if (smellView === 'all') renderAllSmells(); else renderFileSmells();
  smellsEl.scrollTop = top;
}
function renderFileSmells(){
  const r = smells?.report, n = r?.tests ?? 0;
  if (!smells) return smellNote('Reading the tests…');
  if (!r) return smellNote('Fix the tests first: they do not parse.');
  smellScoreEl.textContent = r.items.length ? `${plural(r.items.length, 'smell')} in ${plural(n, 'test')}` : `No smells in ${plural(n, 'test')}`;
  smellScoreEl.dataset.band = r.items.length ? 'warn' : 'ok';
  if (!r.items.length) return smellNote('Nothing to report.');
  for (const sm of P().smells(S().framework)){
    const rows = r.items.filter(i => i.smell === sm.id);
    if (!rows.length) continue;
    const g = smellGroup(sm, rows.length);
    for (const i of rows) g.lastChild.append(lineRow('smell', { what: i.what, detail: i.detail, label: `Go to ${i.what}`, title: 'Go to the line', go: () => testsEd.jump(i.line) }));
    smellList.append(g);
  }
}
// Every smell, named and explained whether or not an example has it, and the
// examples that do under it. A row opens the example at its line.
function renderAllSmells(){
  const ids = P().ids, scanned = all?.key === allKey() && all.waiting <= 0;
  const found = id => (all?.key === allKey() && all.found.get(id)?.items) || [];
  const having = ids.filter(id => found(id).length);
  smellScoreEl.textContent = !scanned ? 'Reading every example…'
    : `${having.length} of ${ids.length} examples ${having.length === 1 ? 'has' : 'have'} one`;
  if (scanned) smellScoreEl.dataset.band = having.length ? 'warn' : 'ok';
  for (const sm of P().smells(S().framework)){
    const rows = ids.flatMap(id => found(id).filter(i => i.smell === sm.id).map(item => ({ id, item })));
    const g = smellGroup(sm, new Set(rows.map(x => x.id)).size);
    if (!rows.length){
      g.dataset.none = '';
      g.lastChild.replaceWith(listNote(scanned ? 'No example has this one.' : 'Reading the examples…'));
    }
    for (const { id, item } of rows){
      const name = P().examples[id].name;
      g.lastChild.append(lineRow('smell', { what: name, detail: item.what, label: `Open ${name} at ${item.what}`, title: `Open ${name} at this line`, go: async () => {
        if (id !== exampleOf(active)) await selectExample(id);
        setSmellView('file');
        testsEd.jump(item.line);
      } }));
    }
    smellList.append(g);
  }
}
onWorker(['smells'], data => onSmells(data.report, data.example));
