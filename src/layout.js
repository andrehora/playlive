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
}
export function saveLayout(){ try { localStorage.setItem(LAYOUT, JSON.stringify(layout)); } catch {} }
export const clampLeft = w => Math.round(Math.min(Math.max(w, 360), $id('workspace').clientWidth * 0.62));
// What the editor may not take: whatever Coverage is currently using, the
// Results panel's own floor, the gaps, and this panel's toolbar. Neither handle
// can squeeze a panel away, which is what keeps the desktop page from scrolling.
export const covPanelEl = () => $id('coverage').closest('.panel');
const covH = () => covPanelEl().getBoundingClientRect().height;
// Results collapsed is its one row, and Coverage takes the space it gave up. So
// the floor the editor must leave below it shrinks to that row plus Coverage's
// own floor, which is what lets the editor grow into a collapsed Results.
const collapsedResults = () => $id('left').dataset.results === 'collapsed';
const resultsFloor = () => collapsedResults()
  ? Math.round($id('results').closest('.panel').getBoundingClientRect().height)
  : 200;
export const clampEditor = h => {
  const below = (collapsedResults() ? 100 : covH()) + resultsFloor() + 100;
  return Math.round(Math.min(Math.max(h, 110), $id('left').clientHeight - below));
};
// And Coverage may not take what the Tests panel above it and the Results floor
// below need: the two gaps and that floor are what is left out here.
export const clampCov = h => {
  const tests = document.querySelector('.tests-panel').getBoundingClientRect().height;
  const room = $id('left').clientHeight - tests - 24 - 130;
  return Math.round(Math.min(Math.max(h, 100), Math.max(100, room)));
};
export function makeResizer(handle, onDrag, onKey, prop){
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
  handle.addEventListener('dblclick', () => { delete layout[prop]; applyLayout(); saveLayout(); });
}
makeResizer($id('colResizer'),
  e => { layout.leftW = clampLeft(e.clientX - $id('left').getBoundingClientRect().left - 6); },
  k => { const w = $id('left').clientWidth; if (k === 'ArrowLeft') return layout.leftW = clampLeft(w - 24); if (k === 'ArrowRight') return layout.leftW = clampLeft(w + 24); },
  'leftW');
makeResizer($id('covResizer'),
  e => { layout.covH = clampCov($id('left').getBoundingClientRect().bottom - e.clientY - 6); },
  k => { const h = covH(); if (k === 'ArrowUp') return layout.covH = clampCov(h + 24); if (k === 'ArrowDown') return layout.covH = clampCov(h - 24); },
  'covH');
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
