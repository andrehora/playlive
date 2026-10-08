/* ---------- A list of suggestions under an editor's caret ----------
   The YAML editor (complete.js) and the code modes' tests editor
   (codecomplete.js) both offer one, and both look and move alike: it lives on
   <body>, in viewport coordinates, because a panel clips what overflows it and
   an editor can be only a few lines tall. On a phone the caret is usually
   under the keyboard, so the list spans the editor's box (`box`) instead.

   What to offer and what accepting one writes are the caller's: show() is
   given the items ({ label, detail }), and onAccept(item) is told which one
   was taken, by Enter, Tab or a click. key(e) handles the list's keys and says
   whether it took the key, so the caller's editor can leave it alone.       */
// `option` names the rows: option0, option1, …
export function suggestionList({ input, id, option = `${id}Opt`, box, onAccept, onToggle = () => {} }){
  const el = document.createElement('div');
  el.className = 'ac'; el.id = id; el.hidden = true;
  el.setAttribute('role', 'listbox'); el.setAttribute('aria-label', 'Suggestions');
  document.body.appendChild(el);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', id);
  input.setAttribute('aria-expanded', 'false');

  let items = null, active = 0, charW = 0;
  const narrow = () => window.innerWidth <= 900;

  // The font is monospace, so one measured character places every caret
  function cellW(){
    if (charW) return charW;
    const probe = document.createElement('span');
    probe.textContent = '0'.repeat(20);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${getComputedStyle(input).font}`;
    document.body.appendChild(probe);
    charW = probe.getBoundingClientRect().width / 20;
    probe.remove();
    return charW;
  }
  function place(){
    el.style.width = ''; el.style.maxWidth = '';
    if (narrow()){
      const ed = box().getBoundingClientRect();
      el.style.left = `${ed.left}px`;
      el.style.width = `${ed.width}px`; el.style.maxWidth = 'none';
      const below = window.innerHeight - ed.bottom;
      if (below >= 150 || below >= ed.top){ el.style.top = `${ed.bottom + 4}px`; el.style.bottom = ''; }
      else { el.style.bottom = `${window.innerHeight - ed.top + 4}px`; el.style.top = ''; }
      return;
    }
    const r = input.getBoundingClientRect(), cs = getComputedStyle(input), lh = parseFloat(cs.lineHeight) || 20;
    const upto = input.value.slice(0, input.selectionStart).split('\n');
    const x = r.left + parseFloat(cs.paddingLeft) + upto.at(-1).length * cellW() - input.scrollLeft;
    const y = r.top + parseFloat(cs.paddingTop) + upto.length * lh - input.scrollTop;
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - el.offsetWidth - 8))}px`;
    const room = window.innerHeight - y;
    if (room < Math.min(el.offsetHeight + 8, 160) && y - lh > room){
      el.style.bottom = `${window.innerHeight - (y - lh) + 2}px`; el.style.top = '';
    } else { el.style.top = `${y + 2}px`; el.style.bottom = ''; }
  }
  function setActive(i){
    active = (i + items.length) % items.length;
    [...el.children].forEach((row, j) => row.setAttribute('aria-selected', String(j === active)));
    input.setAttribute('aria-activedescendant', `${option}${active}`);
    const row = el.children[active];
    if (row.offsetTop < el.scrollTop) el.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = row.offsetTop + row.offsetHeight - el.clientHeight;
  }
  function render(){
    el.innerHTML = '';
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'ac-item'; row.id = `${option}${i}`; row.setAttribute('role', 'option');
      const label = document.createElement('span'); label.className = 'ac-label'; label.textContent = it.label;
      const detail = document.createElement('span'); detail.className = 'ac-detail'; detail.textContent = it.detail || '';
      row.append(label, detail);
      // mousedown, not click: the editor must not lose the caret to the list
      row.addEventListener('mousedown', e => { e.preventDefault(); take(i); });
      el.appendChild(row);
    });
  }
  function take(i){ const it = items?.[i]; if (it) onAccept(it); }

  function show(list){
    items = list; active = 0;
    onToggle(true);
    el.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    render(); place(); setActive(0);
    el.scrollTop = 0;
  }
  function close(){
    if (!items) return;
    items = null; el.hidden = true; el.innerHTML = '';
    onToggle(false);
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  // The list's keys, while it is open. ⌘/Ctrl+Enter and Shift+Tab are the
  // editor's (Run, and leaving the editor), so they close it and pass.
  function key(e){
    if (!items) return false;
    if (e.key === 'ArrowDown'){ setActive(active + 1); return true; }
    if (e.key === 'ArrowUp'){ setActive(active - 1); return true; }
    if (e.key === 'Escape'){ close(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab'){
      if (e.metaKey || e.ctrlKey || e.shiftKey){ close(); return false; }
      take(active); return true;
    }
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) close();
    return false;
  }
  input.addEventListener('blur', close);
  input.addEventListener('scroll', () => { if (items) place(); });
  window.addEventListener('resize', () => { charW = 0; close(); });
  return { show, close, key, element: el, get open(){ return !!items; } };
}
