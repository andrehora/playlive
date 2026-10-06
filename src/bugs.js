import { SITES } from '../examples/examples.js';
import { $id, specEl, summaryEl } from './dom.js';
import { setBugMark, withBase } from './htmlview.js';
import { validate } from './parse.js';
import { setView } from './picker.js';
import { run, syncUI } from './run.js';
import { loadApp, pageSource } from './sites.js';
import { clearBugHtml, editorSite, hunting, recording, running, setBugHtml, setHunting } from './state.js';
import { toast } from './ui.js';

/* ---------- Bugs: what the tests would catch if the page broke ----------

   Coverage says which controls a test touched. It cannot say whether the test
   would notice the page going wrong, and a student who trusts a green 100%
   learns the wrong lesson. So each site may ship a list of bugs: small patches
   on its own source, one at a time, each one a plausible mistake.

   A hunt injects every bug in turn and runs the tests against the broken page.
   A bug the tests fail on is caught; a bug they all pass through escaped, and
   an escaped bug is the most useful row in the app: it names a test nobody has
   written yet. The two scores side by side are the whole point — 100% of the
   controls used, and still a bug through.

   A patch that no longer matches the page is reported as stale rather than
   scoring for free, so editing the page cannot quietly inflate the number.  */

export const bugLists = {};               // site -> the site's bugs, fetched once
export async function bugsFor(site){
  if (bugLists[site] === undefined){
    if (!SITES[site] || !SITES[site].bugs) bugLists[site] = [];
    else {
      try {
        const m = await import(`../examples/${site}/bugs.js`);
        bugLists[site] = Array.isArray(m.default) ? m.default : [];
      } catch { bugLists[site] = []; }
    }
  }
  return bugLists[site];
}

export const outcomes = {};               // site -> Map(bug id -> 'caught' | 'escaped' | 'stale')
const outcomesOf = site => (outcomes[site] ||= new Map());
export const clearBugs = site => { delete outcomes[site]; };
export let injected = null;               // { site, id } while a bug is on the page
let hunted = null;                        // the bug being tried right now, so the list can say so

// A bug is one replacement in the page's own source. It must match exactly
// once: anything else and the page has moved on from what the bug describes.
export function patch(src, bug){
  const parts = src.split(bug.find);
  return parts.length === 2 ? parts.join(bug.replace) : null;
}
// The written page needs the real address to find the stylesheet and hooks the
// markup asks for, and the HTML view skips the tag the runner adds.
const baseFor = site => new URL(`examples/${site}/index.html`, location.href).href;

// Put a bug on the page. The page is written rather than fetched from here on,
// so every test in a run meets the broken version.
export async function inject(site, bug){
  const broken = patch(await pageSource(site), bug);
  if (!broken){
    outcomesOf(site).set(bug.id, 'stale');
    renderBugs();
    return false;
  }
  setBugHtml(site, withBase(broken, baseFor(site)));
  injected = { site, id: bug.id };
  // The HTML view marks the code the bug changed, so it can be read rather than
  // taken on trust.
  setBugMark({ hit: bug.replace.split('\n')[0].trim(), src: await pageSource(site) });
  setView(site);
  await loadApp();
  renderBugs();
  return true;
}
// Back to the page as it ships. Edited markup, if there is any, is the page again.
export async function repair(){
  if (!injected) return;
  const { site } = injected;
  injected = null;
  setBugMark(null);
  clearBugHtml(site);
  renderBugs();
  if (!hunting) await loadApp();
}

/* ---------- The hunt ---------- */
// Every bug in turn, with the whole suite run against each. Deliberate failures,
// so the hunt leaves run history, the site's status and the coverage score alone.
export async function hunt(){
  if (running || recording || hunting) return;
  const site = editorSite;
  const list = await bugsFor(site);
  if (!list.length){ toast('This example has no mutations to try yet'); return; }
  const v = validate(specEl.value);
  if (v.error){ toast('Fix the problems in the file first'); return; }
  if (!v.spec || !v.spec.tests.length){ toast('Write a test first: a mutation needs a test to catch it'); return; }

  // The tests have to pass against the page as it ships. A suite that is
  // already red would call every bug caught, which would be a lie.
  huntBtn.disabled = true;              // from the click, not from the first redraw
  await repair();
  const base = await run();
  if (!base || base.stopped){ renderBugs(); return; }
  if (base.passed < base.ran){
    summaryEl.textContent = `${base.ran - base.passed} of ${base.ran} tests fail on the page as it is. A mutation run needs them green first.`;
    summaryEl.className = 'bad';
    renderBugs();                       // the button was disabled from the click
    return;
  }

  // One repetition at full speed: a hunt is a dozen runs, and what is worth
  // watching is the red arriving, not each step.
  const speedEl = $id('speed'), repeatEl = $id('repeat');
  const hadSpeed = speedEl.value, hadRepeat = repeatEl.value;
  speedEl.value = 'fast'; repeatEl.value = '1';
  setHunting(true); syncUI();
  const res = outcomesOf(site);
  res.clear();
  renderBugs();
  try {
    for (const bug of list){
      hunted = bug.id;
      renderBugs();
      if (!await inject(site, bug)) continue;          // the patch no longer applies
      const r = await run();
      if (!r || r.stopped) break;
      res.set(bug.id, r.passed < r.ran ? 'caught' : 'escaped');
      renderBugs();
    }
  } finally {
    hunted = null;
    setHunting(false);
    speedEl.value = hadSpeed; repeatEl.value = hadRepeat;
    await repair();
    await loadApp();
    syncUI();
    const r = report(site);
    summaryEl.textContent = `Mutation: ${r.caught} of ${r.scored} caught` + (r.escaped ? `, ${r.escaped} through` : '');
    summaryEl.className = r.escaped ? 'bad' : 'ok';
    renderBugs();
  }
}

// What the tests did to this site's bugs. Stale patches are left out of the
// score: a bug that no longer applies is a thing to fix, not a thing to count.
export function report(site = editorSite){
  const list = bugLists[site] || [], res = outcomes[site] || new Map();
  const items = list.map(b => ({ ...b, state: res.get(b.id) || 'unchecked', live: !!injected && injected.site === site && injected.id === b.id }));
  const n = s => items.filter(i => i.state === s).length;
  const caught = n('caught'), escaped = n('escaped'), scored = caught + escaped;
  return {
    site, items, total: list.length, caught, escaped, stale: n('stale'), unchecked: n('unchecked'),
    scored, score: scored ? caught / scored : 0
  };
}
export const percent = r => Math.round(r.score * 100);
export const band = p => p === 100 ? 'ok' : p >= 60 ? 'warn' : 'bad';

/* ---------- The panel ----------
   A panel of its own below Coverage, so the two scores read one under the
   other. It is on screen in Mutation mode and nowhere else, which is why it has no
   fold of its own: the mode is the fold. */
export const bugsEl = $id('bugs'), bugScore = $id('bugScore'), bugBar = $id('bugbar');
export const bugPanel = bugsEl.closest('.panel');   // the band is the panel's, head and bar included
export const bugMeter = $id('bugMeter');
export const huntBtn = $id('hunt');
const GROUPS = [
  ['escaped', 'Escaped', 'The page broke and every test still passed'],
  ['stale', 'No longer applies', 'The page has changed, so this mutation cannot be tried'],
  ['unchecked', 'Not checked yet', 'Nothing has tried these yet'],
  ['caught', 'Caught', 'A test failed, which is a test doing its job']
];

export function renderBugs(){
  // The list is fetched the first time it is wanted; the fetch caches, so the
  // redraw it asks for cannot loop. Until it lands the panel says it is
  // reading, rather than saying there are none.
  if (bugLists[editorSite] === undefined){
    bugsFor(editorSite).then(renderBugs);
    bugScore.textContent = '';
    huntBtn.disabled = true;
    bugsEl.innerHTML = '';
    bugsEl.appendChild(note('Reading this example’s mutations…'));
    return;
  }
  const r = report();
  const pct = percent(r);
  bugPanel.dataset.band = r.scored ? band(pct) : '';
  bugMeter.hidden = !r.scored;
  bugMeter.firstElementChild.style.width = `${pct}%`;
  bugScore.textContent = r.scored ? `${r.caught} of ${r.scored} mutations caught (${pct}%)` : r.total ? `${r.total} mutations` : '';
  bugScore.dataset.band = r.scored ? band(pct) : '';
  huntBtn.disabled = running || recording || hunting || !r.total;
  huntBtn.textContent = hunting ? 'Running…' : r.scored ? 'Run again' : 'Run mutations';
  // Something always says the page is broken on purpose, so a run nobody meant
  // to make against a broken page cannot be mistaken for the real thing. The
  // markup view already has a row of its own, so the message goes there rather
  // than taking a second one.
  const live = r.items.find(i => i.live);
  const text = live ? `Mutation on the page: ${live.title}` : '';
  const inHtml = !$id('htmlPane').hidden;
  bugBar.hidden = !live || inHtml;
  $id('bugbarText').textContent = text;
  $id('htmlBugText').textContent = text;
  $id('htmlBugText').hidden = !live;
  $id('htmlBugRepair').hidden = !live;

  const top = bugsEl.scrollTop;
  bugsEl.innerHTML = '';
  if (!r.total){
    bugsEl.appendChild(note('This example ships no mutations yet. The ones that do can break their own page a dozen ways and ask whether your tests notice.'));
    return;
  }
  for (const [state, title, why] of GROUPS){
    const rows = r.items.filter(i => i.state === state);
    if (!rows.length) continue;
    const g = document.createElement('div');
    g.className = 'bug-group'; g.dataset.state = state;
    const h = document.createElement('div');
    h.className = 'cov-head'; h.title = why;
    h.innerHTML = '<span class="bug-dot" aria-hidden="true"></span><span class="cov-title"></span><span class="cov-n"></span>';
    h.querySelector('.cov-title').textContent = title;
    h.querySelector('.cov-n').textContent = rows.length;
    g.appendChild(h);
    const ul = document.createElement('ul');
    ul.className = 'cov-list';
    for (const b of rows) ul.appendChild(row(b));
    g.appendChild(ul);
    bugsEl.appendChild(g);
  }
  bugsEl.scrollTop = top;
}
function note(text){
  const p = document.createElement('p');
  p.className = 'cov-note'; p.textContent = text;
  return p;
}
// An escaped bug says why it got through: that sentence is the test the file is
// missing, in the words a person would use to describe it.
function row(b){
  const li = document.createElement('li');
  li.className = 'bug-row';
  if (b.live) li.dataset.live = 'yes';
  if (hunted === b.id) li.dataset.trying = 'yes';
  const head = document.createElement('div');
  head.className = 'bug-line';
  const t = document.createElement('span');
  t.className = 'bug-title'; t.textContent = b.title;
  head.appendChild(t);
  // Only when there is something to say: an empty span beside the button would
  // keep it from sitting at the end of the row.
  const note = hunted === b.id ? 'trying…' : b.live ? 'on the page now' : '';
  if (note){
    const m = document.createElement('span');
    m.className = 'bug-m'; m.textContent = note;
    head.appendChild(m);
  }
  if (!hunting){
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ghost small bug-btn';
    btn.textContent = b.live ? 'Repair' : 'Inject';
    btn.title = b.live ? 'Put the page back as it ships' : 'Break the page this way and leave it broken, to look at or run by hand';
    btn.setAttribute('aria-label', b.live ? `Repair: ${b.title}` : `Inject: ${b.title}`);
    btn.addEventListener('click', async () => {
      if (running || recording || hunting) return;
      if (b.live) await repair();
      else { await repair(); await inject(editorSite, b); }
    });
    head.appendChild(btn);
  }
  li.appendChild(head);
  return li;
}

// The bug message rides whichever row the site panel's view has, so a change of
// view redraws it. This module listens for itself rather than being called, and
// listens for the example changing the same way: the bugs on screen are that
// example's.
document.querySelectorAll('.view-seg [data-view]').forEach(b => b.addEventListener('click', () => renderBugs()));
document.addEventListener('playlive:site', () => renderBugs());
// And for the runner going busy, so Run mutations greys out with every other
// control rather than being the one thing a run leaves clickable.
document.addEventListener('playlive:busy', () => renderBugs());
huntBtn.addEventListener('click', () => hunt());

/* ---------- Folding: the score stays, the list goes ----------
   The same stops the other lists have: folded, the panel is its one row and
   Results takes the room back. The mode is still the only way this panel comes
   and goes, but a list of a dozen mutations is a list, and a list folds. */
export const foldBugsBtn = $id('foldBugs');
let folded = false;
export function setBugFolded(f){
  folded = f;
  bugsEl.hidden = f;
  $id('left').dataset.bug = f ? 'collapsed' : 'open';
  foldBugsBtn.setAttribute('aria-expanded', String(!f));
  foldBugsBtn.setAttribute('aria-label', f ? 'Expand the mutations' : 'Collapse the mutations');
  foldBugsBtn.title = f ? 'Show every mutation and what the tests made of it' : 'Hide the list of mutations';
  $id('foldBugsIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
foldBugsBtn.addEventListener('click', () => setBugFolded(!folded));
setBugFolded(false);
[$id('bugbarRepair'), $id('htmlBugRepair')].forEach(b => b.addEventListener('click', () => repair()));
