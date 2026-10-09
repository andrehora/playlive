import { repair } from './bugs.js';
import { enterCreate, leaveCreate } from './create.js';
import { reclamp } from './layout.js';
import { enterLab, leaveLab } from './lab.js';
import { LABS, isLab, isLabCreate, labOf } from './labcore.js';
import { syncUrl } from './share.js';
import { mode, setAppMode } from './state.js';

/* ---------- Modes: what the whole app is for right now ----------

   A mode is not a view of one panel. It is which panels the left column has at
   all, so the choice sits in the app bar beside the example rather than inside
   something it governs.

   They run in the order you would meet them. **Explore** is the examples and
   their tests: read them, watch them run. **Create** takes the file away and
   asks you to write it back from the titles alone. The two that judge what you
   ended up with are tabs beside Results in both: **Mutation** asks whether the
   tests would notice the page going wrong, and **Smells** reads the tests
   themselves and names what is wrong with them.

   Create is the one mode that changes what the editor holds, so it keeps its
   own file per site and hands the other one back on the way out. Nothing you
   wrote in either is ever lost to a change of mode.

   **Python** and **JS/TS** are experiments that leave the sites altogether:
   unit tests on a module, run in the browser, each with examples of its own
   (lab.js).

   The bar asks it as two questions: which language (Python, JS/TS, or HTML for
   the sites), then Explore or Create. They are still one value here, so links
   and the stylesheet read it as one: "python" and "python-create" are Python's
   two (lab.js), "explore" and "create" the sites'. Changing the language keeps
   the side you were on.                                                  */

// In the bar's order, and the first is home: "/" opens Python on its first example.
export const MODES = ['python', 'python-create', 'javascript', 'javascript-create', 'explore', 'create'];

const areaOf = m => labOf(m) || 'html';
const sideOf = m => (m === 'create' || isLabCreate(m) ? 'create' : 'explore');
const canCreate = area => area === 'html' || !!LABS[area]?.create;
// The mode a language and a side make, Explore where the language has no Create
const modeFor = (area, side) => (area === 'html' ? side : side === 'create' && canCreate(area) ? `${area}-create` : area);
let side = 'explore';                 // the side chosen, kept through a language without Create

// `initial` is boot applying the mode the browser remembered. There is nothing
// to come from and nothing on screen yet, so the handovers below would only
// stash an empty editor over whichever file they were handed.
export function setMode(m, { initial = false } = {}){
  const next = MODES.includes(m) ? m : 'explore';
  const was = mode;
  setAppMode(next);
  // On <html>, so the stylesheet can both hide the panel and start the column
  // at heights four panels fit in. index.html ships the attribute already set
  // to Explore, so the bugs panel cannot flash before this module runs.
  document.documentElement.dataset.mode = next;
  // A code mode's runtime is only downloaded once somebody comes to it, and
  // from then on kept.
  if (isLab(next)) enterLab(next); else leaveLab();
  // The list the picker offers is the mode's, so it is told rather than asked.
  document.dispatchEvent(new CustomEvent('playlive:mode'));
  const area = areaOf(next), can = canCreate(area);
  if (can) side = sideOf(next);
  document.querySelectorAll('.area-seg [data-area]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.area === area)));
  document.querySelectorAll('.mode-seg [data-mode]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === sideOf(next))));
  const create = document.querySelector('.mode-seg [data-mode="create"]');
  create.setAttribute('aria-disabled', String(!can));
  create.title = !can ? 'Not yet for this language' : area === 'html' ? 'Write tests from their titles' : 'Write tests from their names';
  if (!initial){
    // A page left broken on purpose must not outlive the mode it was broken in.
    if (was !== next) repair();
    // The editor belongs to the mode in Create, so the swap happens here, after
    // the mode is set: each side saves what it holds before the other loads.
    if (was !== 'create' && next === 'create') enterCreate(was);
    else if (was === 'create' && next !== 'create') leaveCreate();
  }
  syncUrl();                 // the mode is half the link, so the bar says so
  reclamp();           // a panel arriving or leaving changes what fits
}

// A language keeps the side you are on; a side keeps the language
const go = m => { if (m !== mode) setMode(m); };
document.querySelectorAll('.area-seg [data-area]')
  .forEach(b => b.addEventListener('click', () => go(modeFor(b.dataset.area, side))));
document.querySelectorAll('.mode-seg [data-mode]')
  .forEach(b => b.addEventListener('click', () => go(modeFor(areaOf(mode), b.dataset.mode))));
