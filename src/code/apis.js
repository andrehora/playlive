/* ---------- The framework's own names, linked to a search for them ----------
   Pure, so the unit tests can read it. The names are the ones the snippets
   offer (code/snippets.js): `self.assertTrue` gives assertTrue, `pytest.raises`
   raises, `.to.deep.equal` equal. A name that is a member in the snippet
   (after a dot other than `self.`) is only linked after a dot in the code too,
   so Chai's `.true` links and a plain `true` does not. Each link is Google's
   I'm Feeling Lucky for the name on the library's own documentation, so a
   name never lands on what else the library is called after (Jasmine's
   describe is not the plant): "assertTrue site:docs.python.org". */

// Words in the snippets that are the language's or a namespace, not an API
const STOP = new Set(['self', 'import', 'from', 'class', 'not', 'in', 'is', 'None', 'test', 'require',
  'unittest', 'pytest', 'mock', 'mark', 'sinon', 'chai', 'match', 'to', 'be', 'deep', 'have']);

// Where each library documents its names
const DOCS = { unittest: 'docs.python.org', pytest: 'docs.pytest.org', jasmine: 'jasmine.github.io',
  mocha: 'mochajs.org', chai: 'chaijs.com', sinon: 'sinonjs.org' };

// name → { query, member }, for one framework's snippets
export function apisOf(snippets, fw){
  const apis = new Map();
  for (const { label } of snippets){
    for (const chain of label.match(/\.?[A-Za-z_][\w.]*/g) || []){
      const path = chain.replace(/^\.|^self\./, '').replace(/\.$/, ''), parts = path.split('.'), name = parts.at(-1);
      if (name.length < 2 || STOP.has(name) || apis.has(name)) continue;
      // Chai's chains and expect are Chai's, and Sinon's doubles Sinon's, whatever runs them
      const by = path.startsWith('sinon.') ? 'sinon'
        : fw === 'mocha' && (label.startsWith('.') || label.startsWith('expect')) ? 'chai' : fw;
      apis.set(name, { query: `${path} site:${DOCS[by]}`, member: parts.length > 1 || chain.startsWith('.') });
    }
  }
  return apis;
}

export const luckyUrl = query => `https://www.google.com/search?btnI=1&q=${encodeURIComponent(query)}`;

// A highlighted line (code/highlight.js) with the APIs in it linked; never
// inside a string or a comment
export function linkApis(html, apis){
  const quiet = [];
  let prev = '';
  return html.split(/(<[^>]+>)/).map(seg => {
    if (seg.startsWith('<')){
      if (seg.startsWith('</')) quiet.pop();
      else quiet.push(/class="[sc]"/.test(seg));
      return seg;
    }
    if (!seg || quiet.includes(true)){ prev = seg.slice(-1) || prev; return seg; }
    const out = seg.replace(/[A-Za-z_]\w*/g, (w, at) => {
      const api = apis.get(w), before = at ? seg[at - 1] : prev;
      if (!api || /\w/.test(before) || (api.member && before !== '.')) return w;
      return `<a class="api" href="${luckyUrl(api.query).replace(/&/g, '&amp;')}" target="_blank" rel="noopener"`
        + ` title="Look up ${w}">${w}</a>`;
    });
    prev = seg.slice(-1);
    return out;
  }).join('');
}
