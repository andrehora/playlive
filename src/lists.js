/* ---------- Lists: what the graders' panels are made of ----------
   Mutation, Smells and Create, in the site modes and the code modes alike,
   show the same thing: groups, each a head (a dot, a title, a count, and
   why as its tooltip) over a list of rows, and a note where there is nothing
   to list. `kind` is the panel's class prefix (bug, smell or create), which
   the stylesheet colours each dot by.                                      */

// A group, with `state` or `smell` on it for the stylesheet and the tests,
// and `sentence` printed under the head (the smells say what to do there).
// Its list is its last child.
export function listGroup(kind, { title, n, why, state, smell, sentence }){
  const g = document.createElement('div');
  g.className = `${kind}-group`;
  if (state) g.dataset.state = state;
  if (smell) g.dataset.smell = smell;
  g.innerHTML = `<div class="list-head"><span class="${kind}-dot" aria-hidden="true"></span><span class="list-title"></span><span class="list-n"></span></div>`
    + (sentence ? `<p class="${kind}-why"></p>` : '') + '<ul class="list-list"></ul>';
  g.firstChild.title = why;
  g.querySelector('.list-title').textContent = title;
  g.querySelector('.list-n').textContent = n;
  if (sentence) g.querySelector(`.${kind}-why`).textContent = sentence;
  return g;
}

export const listNote = text => Object.assign(document.createElement('p'), { className: 'list-note', textContent: text });

// A row naming something, with a word on how it stands; a button when it
// has somewhere to go (`go`), with `title` as its tooltip and `label` as its name
export function lineRow(kind, { what, detail = '', go, title, label }){
  const li = document.createElement('li');
  li.className = `${kind}-row`;
  const el = document.createElement(go ? 'button' : 'div');
  el.className = `${kind}-line`;
  el.innerHTML = `<span class="${kind}-what"></span><span class="${kind}-m"></span>`;
  el.querySelector(`.${kind}-what`).textContent = what;
  el.querySelector(`.${kind}-m`).textContent = detail;
  if (go){
    el.type = 'button';
    el.title = title;
    el.setAttribute('aria-label', label);
    el.addEventListener('click', go);
  }
  li.append(el);
  return li;
}
