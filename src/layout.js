import { $id } from './dom.js';

/* ---------- Layout: resizable panels and screen sizes, remembered ---------- */
const LAYOUT = 'live-test-runner:layout';
export let layout = {};
try { layout = JSON.parse(localStorage.getItem(LAYOUT) || '{}') || {}; } catch {}
const rootStyle = document.documentElement.style;
function applyLayout(){
  if (layout.leftW) rootStyle.setProperty('--left-w', layout.leftW + 'px'); else rootStyle.removeProperty('--left-w');
  if (layout.editorH) rootStyle.setProperty('--editor-h', layout.editorH + 'px'); else rootStyle.removeProperty('--editor-h');
  if (layout.createH) rootStyle.setProperty('--create-h', layout.createH + 'px'); else rootStyle.removeProperty('--create-h');
  if (layout.codeH) rootStyle.setProperty('--code-h', layout.codeH + 'px'); else rootStyle.removeProperty('--code-h');
}
export function saveLayout(){ try { localStorage.setItem(LAYOUT, JSON.stringify(layout)); } catch {} }
const clampLeft = w => Math.round(Math.min(Math.max(w, 360), $id('workspace').clientWidth * 0.62));
// What the editor may not take: whatever the panels below it are using, the
// Results panel's own floor, the gaps and this panel's toolbar. No handle can
// squeeze a panel away, which is what keeps the desktop page from scrolling —
// in Create, where three panels share the column, as much as in Explore.
// Explore hides the Create panel, and a hidden panel measures zero, so the
// clamps need no second rule for which mode is on: they measure what is there.
const createPanelEl = () => $id('create').closest('.panel');
const createH = () => createPanelEl().getBoundingClientRect().height;
// Results collapsed is its one row, so the floor the editor must leave below it
// shrinks to that row.
const collapsedResults = () => $id('left').dataset.results === 'collapsed';
const collapsedSpec = () => $id('left').dataset.spec === 'collapsed';
const resultsFloor = () => collapsedResults()
  ? Math.round($id('results').closest('.panel').getBoundingClientRect().height)
  : 200;
// A panel that is taking the room another one gave up is measuring what it grew
// to, not what it needs. Its floor is what the clamps must leave it, which is
// what lets the editor grow into a collapsed Results rather than being blocked
// by a panel that only grew because it could. A panel this mode does not have
// measures zero and asks for nothing.
const createFloor = () => (createH() ? (collapsedSpec() ? 100 : createH()) : 0);
const gap = () => 12 * (1 + (createH() ? 1 : 0));
const clampEditor = h => {
  const below = createFloor() + resultsFloor() + gap() + 76;
  return Math.round(Math.min(Math.max(h, 110), $id('left').clientHeight - below));
};
// Create's panel is the last in its column, so what it may not take is
// everything above it.
const clampCreate = h => {
  const tests = document.querySelector('.tests-panel').getBoundingClientRect().height;
  const room = $id('left').clientHeight - tests - gap() - 130;
  return Math.round(Math.min(Math.max(h, 100), Math.max(100, room)));
};
// The code modes' tests may not take what the rest of their panel and the
// Results/Console floor below them need (its head alone when collapsed).
const clampCodeTests = h => {
  const ed = $id('codeTestsEd'), panel = ed.closest('.panel'), below = $id('codeResults').closest('.panel');
  const chrome = panel.getBoundingClientRect().height - ed.getBoundingClientRect().height;
  const floor = $id('left').dataset.code === 'collapsed' ? below.getBoundingClientRect().height : 130;
  return Math.round(Math.min(Math.max(h, 110), $id('left').clientHeight - chrome - floor - 12));
};
// A mode change adds or drops a panel, so the heights the user dragged in the
// other mode may no longer fit. Re-clamping writes back what still does, which
// is what keeps a column dragged tall in Explore from scrolling in Create.
export function reclamp(){
  if (layout.createH) layout.createH = clampCreate(layout.createH);
  if (layout.codeH && $id('codeTestsEd').getClientRects().length) layout.codeH = clampCodeTests(layout.codeH);
  if (layout.editorH) layout.editorH = clampEditor(layout.editorH);
  applyLayout();
  saveLayout();
}
function makeResizer(handle, onDrag, onKey, prop){
  const propNow = () => (typeof prop === 'function' ? prop() : prop);
  handle.addEventListener('pointerdown', e => {
    e.preventDefault(); handle.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing'); handle.classList.add('active');
    const move = ev => { onDrag(ev); applyLayout(); };
    const up = () => {
      handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing'); handle.classList.remove('active'); saveLayout();
    };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
  handle.addEventListener('keydown', e => { const d = onKey(e.key); if (d){ e.preventDefault(); applyLayout(); saveLayout(); } });
  handle.addEventListener('dblclick', () => { delete layout[propNow()]; applyLayout(); saveLayout(); });
}
makeResizer($id('colResizer'),
  e => { layout.leftW = clampLeft(e.clientX - $id('left').getBoundingClientRect().left - 6); },
  k => { const w = $id('left').clientWidth; if (k === 'ArrowLeft') return layout.leftW = clampLeft(w - 24); if (k === 'ArrowRight') return layout.leftW = clampLeft(w + 24); },
  'leftW');
// With Results collapsed there is nothing below it to split, so Create's
// panel fills what is left and its own height is no longer what the handle
// sets. The handle still means the same thing — drag the panel's top edge — so
// it moves the one boundary above it that can give: the editor's. The gap it
// measures is what sits between them (the toolbar, the other handle, the
// collapsed Results row), which does not change as the editor grows, so a drag
// cannot drift.
const editorForHandleTop = (handle, y) => {
  const ed = $id('editor').getBoundingClientRect();
  return clampEditor(y - 6 - (handle.getBoundingClientRect().top - ed.bottom) - ed.top);
};
// Create's panel is the last in its mode: with Results collapsed there is
// nothing below to split, and the handle moves the editor's boundary instead
// (editorForHandleTop above).
makeResizer($id('createResizer'),
  e => {
    if (collapsedResults()) return layout.editorH = editorForHandleTop($id('createResizer'), e.clientY);
    layout.createH = clampCreate($id('left').getBoundingClientRect().bottom - e.clientY - 6);
  },
  k => {
    const h = collapsedResults() ? $id('editor').clientHeight : createH();
    if (k === 'ArrowUp') return collapsedResults() ? layout.editorH = clampEditor(h - 24) : layout.createH = clampCreate(h + 24);
    if (k === 'ArrowDown') return collapsedResults() ? layout.editorH = clampEditor(h + 24) : layout.createH = clampCreate(h - 24);
  },
  () => (collapsedResults() ? 'editorH' : 'createH'));
makeResizer($id('rowResizer'),
  e => { layout.editorH = clampEditor(e.clientY - $id('editor').getBoundingClientRect().top - 6); },
  k => { const h = $id('editor').clientHeight; if (k === 'ArrowUp') return layout.editorH = clampEditor(h - 24); if (k === 'ArrowDown') return layout.editorH = clampEditor(h + 24); },
  'editorH');
// The code modes' handle sits under the Tests panel's toolbar: the code's bottom
// keeps its distance from the handle, so the handle stays under the pointer.
makeResizer($id('codeResizer'),
  e => {
    const ed = $id('codeTestsEd').getBoundingClientRect();
    layout.codeH = clampCodeTests(e.clientY - 6 - ($id('codeResizer').getBoundingClientRect().top - ed.bottom) - ed.top);
  },
  k => { const h = $id('codeTestsEd').clientHeight; if (k === 'ArrowUp') return layout.codeH = clampCodeTests(h - 24); if (k === 'ArrowDown') return layout.codeH = clampCodeTests(h + 24); },
  'codeH');
function setViewport(vp){
  $id('device').dataset.vp = vp;
  document.querySelectorAll('.seg [data-vp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vp === vp)));
  layout.vp = vp; saveLayout();
}
document.querySelectorAll('.seg [data-vp]').forEach(b => b.addEventListener('click', () => setViewport(b.dataset.vp)));
// The shortcut still works; it's mentioned in the button's tooltip instead
// The shortcut is shown in the Run button's tooltip (set in syncUI)
applyLayout();
setViewport(layout.vp || 'desktop');
