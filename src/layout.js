import { $id } from './dom.js';

/* ---------- Layout: resizable panels and screen sizes, remembered ---------- */
export const LAYOUT = 'live-test-runner:layout';
export let layout = {};
try { layout = JSON.parse(localStorage.getItem(LAYOUT) || '{}') || {}; } catch {}
export const rootStyle = document.documentElement.style;
export function applyLayout(){
  if (layout.leftW) rootStyle.setProperty('--left-w', layout.leftW + 'px'); else rootStyle.removeProperty('--left-w');
  if (layout.editorH) rootStyle.setProperty('--editor-h', layout.editorH + 'px'); else rootStyle.removeProperty('--editor-h');
  if (layout.covH) rootStyle.setProperty('--cov-h', layout.covH + 'px'); else rootStyle.removeProperty('--cov-h');
  if (layout.bugH) rootStyle.setProperty('--bug-h', layout.bugH + 'px'); else rootStyle.removeProperty('--bug-h');
  if (layout.smellH) rootStyle.setProperty('--smell-h', layout.smellH + 'px'); else rootStyle.removeProperty('--smell-h');
  if (layout.createH) rootStyle.setProperty('--create-h', layout.createH + 'px'); else rootStyle.removeProperty('--create-h');
}
export function saveLayout(){ try { localStorage.setItem(LAYOUT, JSON.stringify(layout)); } catch {} }
export const clampLeft = w => Math.round(Math.min(Math.max(w, 360), $id('workspace').clientWidth * 0.62));
// What the editor may not take: whatever the panels below it are using, the
// Results panel's own floor, the gaps and this panel's toolbar. No handle can
// squeeze a panel away, which is what keeps the desktop page from scrolling —
// in Mutation, where four panels share the column, as much as in Explore.
export const covPanelEl = () => $id('coverage').closest('.panel');
export const bugPanelEl = () => $id('bugs').closest('.panel');
const covH = () => covPanelEl().getBoundingClientRect().height;
// Explore mode hides the bugs panel, and a hidden panel measures zero, so the
// clamps need no second rule for which mode is on: they measure what is there.
const bugH = () => bugPanelEl().getBoundingClientRect().height;
export const smellPanelEl = () => $id('smells').closest('.panel');
const smellH = () => smellPanelEl().getBoundingClientRect().height;
export const createPanelEl = () => $id('create').closest('.panel');
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
const covFloor = () => (covH() ? (collapsedResults() ? 100 : covH()) : 0);
const bugFloor = () => (bugH() ? (collapsedSpec() ? 100 : bugH()) : 0);
const smellFloor = () => (smellH() ? (collapsedSpec() ? 100 : smellH()) : 0);
const createFloor = () => (createH() ? (collapsedSpec() ? 100 : createH()) : 0);
const gap = () => 12 * (1 + (covH() ? 1 : 0) + (bugH() ? 1 : 0) + (smellH() ? 1 : 0) + (createH() ? 1 : 0));
export const clampEditor = h => {
  const below = covFloor() + bugFloor() + smellFloor() + createFloor() + resultsFloor() + gap() + 76;
  return Math.round(Math.min(Math.max(h, 110), $id('left').clientHeight - below));
};
// And Coverage may not take what the Tests panel above it, the Bugs panel below
// it and the Results floor need: the gaps and that floor are left out here too.
export const clampCov = h => {
  const tests = document.querySelector('.tests-panel').getBoundingClientRect().height;
  const room = $id('left').clientHeight - tests - bugFloor() - smellFloor() - createFloor() - gap() - 130;
  return Math.round(Math.min(Math.max(h, 100), Math.max(100, room)));
};
// Mutation and Test smells are last in the modes that have them, so what each
// may not take is everything above it.
export const clampBug = h => {
  const tests = document.querySelector('.tests-panel').getBoundingClientRect().height;
  const room = $id('left').clientHeight - tests - covFloor() - gap() - 130;
  return Math.round(Math.min(Math.max(h, 100), Math.max(100, room)));
};
export const clampSmell = h => {
  const tests = document.querySelector('.tests-panel').getBoundingClientRect().height;
  const room = $id('left').clientHeight - tests - gap() - 130;
  return Math.round(Math.min(Math.max(h, 100), Math.max(100, room)));
};
export const clampCreate = clampSmell;      // last in its mode too, with the same room
// A mode change adds or drops a panel, so the heights the user dragged in the
// other mode may no longer fit. Re-clamping writes back what still does, which
// is what keeps a column dragged tall in Explore from scrolling in Mutation.
export function reclamp(){
  if (layout.covH) layout.covH = clampCov(layout.covH);
  if (layout.bugH) layout.bugH = clampBug(layout.bugH);
  if (layout.smellH) layout.smellH = clampSmell(layout.smellH);
  if (layout.createH) layout.createH = clampCreate(layout.createH);
  if (layout.editorH) layout.editorH = clampEditor(layout.editorH);
  applyLayout();
  saveLayout();
}
export function makeResizer(handle, onDrag, onKey, prop){
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
// With Results collapsed there is nothing below it to split, so Coverage fills
// what is left and its own height is no longer what the handle sets. The handle
// still means the same thing — drag Coverage's top edge — so it moves the one
// boundary above it that can give: the editor's. The gap it measures is what
// sits between them (the toolbar, the other handle, the collapsed Results row),
// which does not change as the editor grows, so a drag cannot drift.
const editorForHandleTop = (handle, y) => {
  const ed = $id('editor').getBoundingClientRect();
  return clampEditor(y - 6 - (handle.getBoundingClientRect().top - ed.bottom) - ed.top);
};
makeResizer($id('covResizer'),
  e => {
    if (collapsedResults()) return layout.editorH = editorForHandleTop($id('covResizer'), e.clientY);
    layout.covH = clampCov($id('left').getBoundingClientRect().bottom - e.clientY - 6);
  },
  k => {
    const h = collapsedResults() ? $id('editor').clientHeight : covH();
    if (k === 'ArrowUp') return collapsedResults() ? layout.editorH = clampEditor(h - 24) : layout.covH = clampCov(h + 24);
    if (k === 'ArrowDown') return collapsedResults() ? layout.editorH = clampEditor(h + 24) : layout.covH = clampCov(h - 24);
  },
  () => (collapsedResults() ? 'editorH' : 'covH'));
makeResizer($id('bugResizer'),
  e => { layout.bugH = clampBug($id('left').getBoundingClientRect().bottom - e.clientY - 6); },
  k => { const h = bugH(); if (k === 'ArrowUp') return layout.bugH = clampBug(h + 24); if (k === 'ArrowDown') return layout.bugH = clampBug(h - 24); },
  'bugH');
// Test smells is the last panel in its mode, so its handle behaves exactly as
// Coverage's does in the modes that have it: with Results collapsed there is
// nothing below to split, and it moves the editor's boundary instead.
makeResizer($id('smellResizer'),
  e => {
    if (collapsedResults()) return layout.editorH = editorForHandleTop($id('smellResizer'), e.clientY);
    layout.smellH = clampSmell($id('left').getBoundingClientRect().bottom - e.clientY - 6);
  },
  k => {
    const h = collapsedResults() ? $id('editor').clientHeight : smellH();
    if (k === 'ArrowUp') return collapsedResults() ? layout.editorH = clampEditor(h - 24) : layout.smellH = clampSmell(h + 24);
    if (k === 'ArrowDown') return collapsedResults() ? layout.editorH = clampEditor(h + 24) : layout.smellH = clampSmell(h - 24);
  },
  () => (collapsedResults() ? 'editorH' : 'smellH'));
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
export function setViewport(vp){
  $id('device').dataset.vp = vp;
  document.querySelectorAll('.seg [data-vp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vp === vp)));
  layout.vp = vp; saveLayout();
}
document.querySelectorAll('.seg [data-vp]').forEach(b => b.addEventListener('click', () => setViewport(b.dataset.vp)));
// The shortcut still works; it's mentioned in the button's tooltip instead
// The shortcut is shown in the Run button's tooltip (set in syncUI)
applyLayout();
setViewport(layout.vp || 'desktop');
