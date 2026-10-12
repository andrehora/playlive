/* ---------- The framework's own names, linked to a search for them ----------
   Pure, so the unit tests can read it. The names are the ones the snippets
   offer (code/snippets.js): `self.assertTrue` gives assertTrue, `pytest.raises`
   raises, `.to.deep.equal` equal. Compare's line of the names a side uses
   links each (code/terms.js). Each link is Google's
   I'm Feeling Lucky for the name on the library's own documentation, so a
   name never lands on what else the library is called after (Jasmine's
   describe is not the plant): "assertTrue site:docs.python.org". */

// Words in the snippets that are the language's or a namespace, not an API
const STOP = new Set(['self', 'import', 'from', 'class', 'not', 'in', 'is', 'None', 'test', 'require',
  'unittest', 'pytest', 'mock', 'mark', 'sinon', 'chai', 'match', 'to', 'be', 'deep', 'have']);

// Where each library documents its names
const DOCS = { unittest: 'docs.python.org', pytest: 'docs.pytest.org', jasmine: 'jasmine.github.io',
  mocha: 'mochajs.org', chai: 'chaijs.com', sinon: 'sinonjs.org' };

// name → { query }, for one framework's snippets
export function apisOf(snippets, fw){
  const apis = new Map();
  for (const { label } of snippets){
    for (const chain of label.match(/\.?[A-Za-z_][\w.]*/g) || []){
      const path = chain.replace(/^\.|^self\./, '').replace(/\.$/, ''), parts = path.split('.'), name = parts.at(-1);
      if (name.length < 2 || STOP.has(name) || apis.has(name)) continue;
      // Chai's chains and expect are Chai's, and Sinon's doubles Sinon's, whatever runs them
      const by = path.startsWith('sinon.') ? 'sinon'
        : fw === 'mocha' && (label.startsWith('.') || label.startsWith('expect')) ? 'chai' : fw;
      apis.set(name, { query: `${path} site:${DOCS[by]}` });
    }
  }
  return apis;
}

export const luckyUrl = query => `https://www.google.com/search?btnI=1&q=${encodeURIComponent(query)}`;
