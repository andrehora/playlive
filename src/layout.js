import { $id } from './dom.js';
import { setCurrentLine } from './editor.js';
import { loadApp } from './sites.js';
import { clearEditedHtml, currentSite, recording, running } from './state.js';

/* ---------- Layout: resizable panels and screen sizes, remembered ---------- */
export const LAYOUT = 'live-test-runner:layout:v1';
export let layout = {};
try { layout = JSON.parse(localStorage.getItem(LAYOUT) || '{}') || {}; } catch {}
export const rootStyle = document.documentElement.style;
export function applyLayout(){
  if (layout.leftW) rootStyle.setProperty('--left-w', layout.leftW + 'px'); else rootStyle.removeProperty('--left-w');
  if (layout.editorH) rootStyle.setProperty('--editor-h', layout.editorH + 'px'); else rootStyle.removeProperty('--editor-h');
}
export function saveLayout(){ try { localStorage.setItem(LAYOUT, JSON.stringify(layout)); } catch {} }
export const clampLeft = w => Math.round(Math.min(Math.max(w, 360), $id('workspace').clientWidth * 0.62));
export const clampEditor = h => Math.round(Math.min(Math.max(h, 110), $id('left').clientHeight - 320));
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
// Reload is the way back to the page as its file writes it, applied HTML and all
$id('reload').addEventListener('click', () => {
  if (running || recording) return;
  clearEditedHtml(currentSite);
  loadApp();
});
// The shortcut still works; it's mentioned in the button's tooltip instead
// The shortcut is shown in the Run button's tooltip (set in syncUI)
applyLayout();
setViewport(layout.vp || 'desktop');
// "Follow": highlight the line of the running step in the editor (on by default, remembered)
export const trackLineEl = $id('trackLine');
trackLineEl.checked = layout.trackLine !== false;
trackLineEl.addEventListener('change', () => {
  layout.trackLine = trackLineEl.checked; saveLayout();
  if (!trackLineEl.checked) setCurrentLine(-1);
});
