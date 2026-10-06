import { repair } from './bugs.js';
import { enterCreate, leaveCreate } from './create.js';
import { layout, reclamp, saveLayout } from './layout.js';
import { syncUrl } from './share.js';
import { scanSites } from './smells.js';
import { mode, setAppMode } from './state.js';

/* ---------- Modes: what the whole app is for right now ----------

   A mode is not a view of one panel. It is which panels the left column has at
   all, so the choice sits in the app bar beside the example rather than inside
   something it governs.

   They run in the order you would meet them. **Explore** is the examples and
   their tests: read them, watch them run. **Create** takes the file away and
   asks you to write it back from the titles alone. Then the three that judge
   what you ended up with: **Coverage** asks how much of the page the tests
   reach, **Mutation** asks the harder one — would they notice the page going
   wrong? — and puts its panel below Coverage, because the two scores read
   together, and **Smells** reads the tests themselves and names what is wrong
   with them.

   Create is the one mode that changes what the editor holds, so it keeps its
   own file per site and hands the other one back on the way out. Nothing you
   wrote in either is ever lost to a change of mode.

   The mode is the fold. A panel that is only there in the mode that needs it
   needs no button to hide it, which is why the Mutation panel has none.        */

export const MODES = ['explore', 'create', 'coverage', 'mutation', 'smells'];

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
  // Smells narrows the example list to the ones that have one, which means
  // reading every example's tests. Once, and the files are cached from then on.
  if (next === 'smells') scanSites();
  // The list the picker offers is the mode's, so it is told rather than asked.
  document.dispatchEvent(new CustomEvent('playlive:mode'));
  document.querySelectorAll('.mode-seg [data-mode]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
  if (!initial){
    // A page left broken on purpose must not outlive the panel that says so.
    if (was === 'mutation' && next !== 'mutation') repair();
    // The editor belongs to the mode in Create, so the swap happens here, after
    // the mode is set: each side saves what it holds before the other loads.
    if (was !== 'create' && next === 'create') enterCreate(was);
    else if (was === 'create' && next !== 'create') leaveCreate();
  }
  layout.mode = next;
  saveLayout();
  syncUrl();                 // the mode is half the link, so the bar says so
  reclamp();           // a fourth panel arriving or leaving changes what fits
}

document.querySelectorAll('.mode-seg [data-mode]')
  .forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
