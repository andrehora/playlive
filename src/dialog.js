import { $id, errorEl, specEl } from './dom.js';
import { escH } from './editor.js';
import { toCypress, toPlaywright } from './exports.js';
import { layout, saveLayout } from './layout.js';
import { validate } from './parse.js';
import { toast } from './ui.js';

/* ---------- Dialog ---------- */
// Framework logos from Devicon (https://devicon.dev), inlined because published pages can't load remote images
export const DEVICONS = {
  "playwright": "<svg aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 128 128\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M43.662 70.898c-4.124 1.17-6.829 3.222-8.611 5.272 1.707-1.494 3.993-2.865 7.077-3.739 3.155-.894 5.846-.888 8.069-.459v-1.739c-1.897-.173-4.072-.035-6.536.664ZM34.863 56.28l-15.314 4.035s.279.394.796.92l12.984-3.421s-.184 2.371-1.782 4.492c3.022-2.287 3.316-6.025 3.316-6.025Zm12.819 35.991C26.131 98.076 14.729 73.1 11.277 60.137 9.682 54.153 8.986 49.621 8.8 46.697a4.955 4.955 0 0 1 .011-.794c-1.118.068-1.653.649-1.544 2.328.186 2.923.882 7.454 2.477 13.44 3.45 12.961 14.854 37.937 36.405 32.132 4.691-1.264 8.215-3.565 10.86-6.504-2.438 2.202-5.49 3.937-9.327 4.972Zm4.05-51.276v1.534h8.453c-.173-.543-.348-1.032-.522-1.534h-7.932Z\" fill=\"#2D4552\"/><path d=\"M62.074 53.627c3.802 1.08 5.812 3.745 6.875 6.104l4.239 1.204s-.578-8.255-8.045-10.376c-6.985-1.985-11.284 3.881-11.807 4.64 2.032-1.448 4.999-2.633 8.738-1.572Zm33.741 6.142c-6.992-1.994-11.289 3.884-11.804 4.633 2.034-1.446 4.999-2.632 8.737-1.566 3.796 1.081 5.804 3.743 6.87 6.104l4.245 1.208s-.588-8.257-8.048-10.379Zm-4.211 21.766-35.261-9.858s.382 1.935 1.846 4.441l29.688 8.3c2.444-1.414 3.726-2.883 3.726-2.883Zm-24.446 21.218c-27.92-7.485-24.544-43.059-20.027-59.916 1.86-6.947 3.772-12.11 5.358-15.572-.946-.195-1.73.304-2.504 1.878-1.684 3.415-3.837 8.976-5.921 16.76-4.516 16.857-7.892 52.429 20.027 59.914 13.159 3.525 23.411-1.833 31.053-10.247-7.254 6.57-16.515 10.253-27.986 7.182Z\" fill=\"#2D4552\"/><path d=\"M51.732 83.935v-7.179l-19.945 5.656s1.474-8.563 11.876-11.514c3.155-.894 5.846-.888 8.069-.459V40.995h9.987c-1.087-3.36-2.139-5.947-3.023-7.744-1.461-2.975-2.96-1.003-6.361 1.842-2.396 2.001-8.45 6.271-17.561 8.726-9.111 2.457-16.476 1.805-19.55 1.273-4.357-.752-6.636-1.708-6.422 1.605.186 2.923.882 7.455 2.477 13.44 3.45 12.962 14.854 37.937 36.405 32.132 5.629-1.517 9.603-4.515 12.357-8.336h-8.309v.002Zm-32.185-23.62 15.316-4.035s-.446 5.892-6.188 7.405c-5.743 1.512-9.128-3.371-9.128-3.371Z\" fill=\"#E2574C\"/><path d=\"M109.372 41.336c-3.981.698-13.532 1.567-25.336-1.596-11.807-3.162-19.64-8.692-22.744-11.292-4.4-3.685-6.335-6.246-8.24-2.372-1.684 3.417-3.837 8.977-5.921 16.762-4.516 16.857-7.892 52.429 20.027 59.914 27.912 7.479 42.772-25.017 47.289-41.875 2.084-7.783 2.998-13.676 3.25-17.476.287-4.305-2.67-3.055-8.324-2.064ZM53.28 55.282s4.4-6.843 11.862-4.722c7.467 2.121 8.045 10.376 8.045 10.376L53.28 55.282Zm18.215 30.706c-13.125-3.845-15.15-14.311-15.15-14.311l35.259 9.858c0-.002-7.117 8.25-20.109 4.453Zm12.466-21.51s4.394-6.838 11.854-4.711c7.46 2.124 8.048 10.379 8.048 10.379l-19.902-5.668Z\" fill=\"#2EAD33\"/><path d=\"M44.762 78.733 31.787 82.41s1.41-8.029 10.968-11.212l-7.347-27.573-.635.193c-9.111 2.457-16.476 1.805-19.55 1.273-4.357-.751-6.636-1.708-6.422 1.606.186 2.923.882 7.454 2.477 13.44 3.45 12.961 14.854 37.937 36.405 32.132l.635-.199-3.555-13.337ZM19.548 60.315l15.316-4.035s-.446 5.892-6.188 7.405c-5.743 1.512-9.128-3.371-9.128-3.371Z\" fill=\"#D65348\"/><path d=\"m72.086 86.132-.594-.144c-13.125-3.844-15.15-14.311-15.15-14.311l18.182 5.082L84.15 39.77l-.116-.031c-11.807-3.162-19.64-8.692-22.744-11.292-4.4-3.685-6.335-6.246-8.24-2.372-1.682 3.417-3.836 8.977-5.92 16.762-4.516 16.857-7.892 52.429 20.027 59.914l.572.129 4.357-16.748Zm-18.807-30.85s4.4-6.843 11.862-4.722c7.467 2.121 8.045 10.376 8.045 10.376l-19.907-5.654Z\" fill=\"#1D8D22\"/><path d=\"m45.423 78.544-3.48.988c.822 4.634 2.271 9.082 4.545 13.011.396-.087.788-.163 1.192-.273a25.224 25.224 0 0 0 2.98-1.023c-2.541-3.771-4.222-8.114-5.237-12.702Zm-1.359-32.64c-1.788 6.674-3.388 16.28-2.948 25.915a20.061 20.061 0 0 1 2.546-.923l.644-.144c-.785-10.292.912-20.78 2.825-27.915a139.404 139.404 0 0 1 1.455-5.05 45.171 45.171 0 0 1-2.578 1.53 132.234 132.234 0 0 0-1.944 6.587Z\" fill=\"#C04B41\"/></svg>",
  "cypress": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\"><defs><linearGradient id=\"dvcy-b\" x1=\"323.384\" x2=\"56.936\" y1=\"12.396\" y2=\"577.503\" gradientTransform=\"translate(-.876 -.754) scale(.13472)\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#69d3a7\"/><stop offset=\".823\" stop-color=\"#2ab586\"/><stop offset=\"1\" stop-color=\"#1cae7f\"/></linearGradient><linearGradient id=\"dvcy-a\" x1=\"992.991\" x2=\"568.87\" y1=\"483.702\" y2=\"758.304\" gradientTransform=\"translate(-.876 -.754) scale(.13472)\" gradientUnits=\"userSpaceOnUse\"><stop offset=\".081\" stop-color=\"#69d3a7\"/><stop offset=\"1\" stop-color=\"#69d3a7\" stop-opacity=\"0\"/></linearGradient><linearGradient id=\"dvcy-c\" x1=\"5.828\" x2=\"704.494\" y1=\"697.848\" y2=\"917.116\" gradientTransform=\"translate(-.876 -.754) scale(.13472)\" gradientUnits=\"userSpaceOnUse\"><stop offset=\".077\" stop-color=\"#1cae7f\"/><stop offset=\".164\" stop-color=\"#1ca379\"/><stop offset=\".316\" stop-color=\"#1c8568\"/><stop offset=\".516\" stop-color=\"#1b554d\"/><stop offset=\".719\" stop-color=\"#1b1e2e\"/></linearGradient></defs><path d=\"M44.984 50.817c5.173 0 9.377 2.762 11.532 7.558l.162.378 8.676-2.95-.175-.445c-3.355-8.192-11.101-13.27-20.195-13.27-6.4 0-11.6 2.047-15.897 6.264-4.271 4.19-6.427 9.458-6.427 15.655 0 6.157 2.17 11.397 6.427 15.574 4.297 4.217 9.498 6.264 15.897 6.264 9.094 0 16.827-5.092 20.195-13.27l.175-.444-8.69-2.95-.148.39c-1.94 4.729-6.251 7.544-11.532 7.544-3.597 0-6.642-1.253-9.04-3.732-2.439-2.505-3.665-5.671-3.665-9.376 0-3.732 1.2-6.83 3.665-9.458 2.411-2.479 5.443-3.732 9.04-3.732z\" class=\"st0\"/><path fill=\"url(#dvcy-a)\" d=\"m82.652 125.13-2.586-8.528c23.334-7.086 39.015-28.224 39.015-52.595 0-6.723-1.199-13.297-3.57-19.522l8.326-3.166A63.468 63.468 0 0 1 128 64.02c-.013 28.305-18.228 52.865-45.348 61.11Z\"/><path fill=\"#69d3a7\" d=\"M116.67 47.894C109.543 24.641 88.378 9.026 63.993 9.026a56.039 56.039 0 0 0-9.861.876l-1.577-8.77A64.836 64.836 0 0 1 63.993.108c28.319 0 52.906 18.147 61.191 45.159z\"/><path fill=\"url(#dvcy-b)\" d=\"M4.096 86.532C1.374 79.338 0 71.753 0 64.007 0 31 24.776 3.664 57.634.43l.876 8.865C30.232 12.085 8.905 35.607 8.905 64.006a54.82 54.82 0 0 0 3.516 19.387z\"/><path d=\"M64.33 42.896 81.79 85.63l-12.718 30.85 8.905 1.779 30.96-75.364h-9.62l-12.353 31.31-12.449-31.31z\" class=\"st0\"/><path fill=\"url(#dvcy-c)\" d=\"m70.675 112.601-1.872 4.54c-.431 1.038-1.415 1.752-2.52 1.792-.767.027-1.522.054-2.303.054-24.452 0-46.224-16.369-52.946-39.81l-8.569 2.451c7.814 27.228 33.102 46.25 61.501 46.264h.014c.889 0 1.778-.013 2.667-.054 4.567-.188 8.65-3.058 10.4-7.302l2.534-6.156z\"/></svg>"
};

export const dlg = $id('dlg'), dlgText = $id('dlgText');
export let dlgRaw = '';
// Small JavaScript/TypeScript highlighter for the exported Playwright and Cypress code
export const JS_KEYWORDS = new Set(['import','from','export','const','let','var','async','await','return','new','true','false','null','undefined','function']);
export const JS_OBJECTS = new Set(['page','cy','expect','test','describe','it','BASE','unique','driver']);
export function highlightJs(code){
  const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)|(=>|[{}()[\];,.+])/g;
  let out = '', last = 0, m;
  while ((m = re.exec(code))){
    out += escH(code.slice(last, m.index));
    const [tok, com, str, num, id, punct] = m;
    if (com) out += `<i class="c">${escH(tok)}</i>`;
    else if (str){
      let inner = escH(tok);
      if (tok[0] === '`') inner = inner.replace(/\$\{\w+\}/g, x => `<i class="o">${x}</i>`);
      out += `<i class="s">${inner}</i>`;
    }
    else if (num) out += `<i class="n">${tok}</i>`;
    else if (id){
      const call = /^\s*\(/.test(code.slice(re.lastIndex));
      const cls = JS_KEYWORDS.has(id) ? 'k' : JS_OBJECTS.has(id) ? 'o' : call ? 'f' : '';
      out += cls ? `<i class="${cls}">${id}</i>` : id;
    }
    else out += `<i class="p">${escH(punct)}</i>`;
    last = re.lastIndex;
  }
  return out + escH(code.slice(last));
}
// openDialog(title, note, text) shows one text; openDialog(title, [{label, note, text}], null, active)
// shows tabs to switch between several (used by Export: Playwright and Cypress)
export function openDialog(title, note, text, active = 0, onTab){
  $id('dlgTitle').textContent = title;
  const tabsBox = $id('dlgTabs'), views = Array.isArray(note) ? note : null;
  const show = i => {
    const v = views ? views[i] : { note, text };
    $id('dlgNote').textContent = v.note; dlgRaw = v.text; dlgText.innerHTML = highlightJs(v.text); dlgText.scrollTop = 0; dlgText.scrollLeft = 0;
    $id('dlgCopied').textContent = '';
    tabsBox.querySelectorAll('button').forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    if (views && onTab) onTab(i);
  };
  tabsBox.innerHTML = ''; tabsBox.hidden = !views;
  (views || []).forEach((v, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = v.icon || ''; b.appendChild(document.createTextNode(v.label));
    b.addEventListener('click', () => show(i));
    b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ const n = (i + (e.key === 'ArrowRight' ? 1 : views.length - 1)) % views.length; show(n); tabsBox.children[n].focus(); } });
    tabsBox.appendChild(b);
  });
  dlg.showModal();
  show(views ? Math.min(active, views.length - 1) : 0);
}
$id('dlgCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(dlgRaw); }
  catch { const t = document.createElement('textarea'); t.value = dlgRaw; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  $id('dlgCopied').textContent = 'Copied to clipboard'; toast('Copied to clipboard');
});
$id('dlgClose').addEventListener('click', () => dlg.close());
$id('export').addEventListener('click', () => {
  const { spec, error } = validate(specEl.value);
  if (error){ errorEl.textContent = 'Fix these problems before exporting:\n' + error; return; }
  openDialog('Export tests', [
    { label: 'Playwright', icon: DEVICONS.playwright, note: '', text: toPlaywright(spec) },
    { label: 'Cypress', icon: DEVICONS.cypress, note: '', text: toCypress(spec) }
  ], null, layout.exportTab || 0, i => { layout.exportTab = i; saveLayout(); });
});
