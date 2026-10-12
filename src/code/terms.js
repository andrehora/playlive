/* ---------- What differs, in a few words ----------
   Pure, so the unit tests can read it. Compare names, under each side's
   head, what that side writes for each part of a test and the other side does
   not: "Setup @pytest.fixture · Check assert" beside "Setup setUp · Check
   assertEqual". The names are the framework's own, from its snippets
   (code/snippets.js), found in the code outside its strings and comments. A
   part both sides write alike is left out. Alone, a side names all it uses. */

// Each part of a test, and how a snippet's name says it is that part
const ROLES = [
  ['Setup', /^(setUp|tearDown|@pytest\.fixture|beforeEach|afterEach|beforeAll|afterAll|before|after|tmp_path)$/],
  ['Errors', /raises|Raises|[tT]hrow/],
  ['Doubles', /patch|spyOn|sinon\.(stub|restore)/],
  ['Check', /^(assert|self\.assert|expect$|\.)/],
];
const roleOf = name => ROLES.find(([, re]) => re.test(name))?.[0];
// The order they are told in
const ORDER = ['Setup', 'Check', 'Errors', 'Doubles'];

// The code with its strings and comments blanked, so a word in them is not use
export function codeOnly(text){
  let out = '';
  for (let i = 0; i < text.length; i++){
    const c = text[i], two = text.slice(i, i + 2);
    if (c === '#' || two === '//'){ while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (two === '/*'){ const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 1; out += ' '; continue; }
    if (c === '"' || c === "'" || c === '`'){
      for (i++; i < text.length && text[i] !== c && text[i] !== '\n'; i++) if (text[i] === '\\') i++;
      out += '""';
      continue;
    }
    out += c;
  }
  return out;
}

// The names, by part, that the code uses: { Setup: ['setUp'], … }
export function termsIn(text, snippets){
  const code = codeOnly(text), out = {};
  for (const { label } of snippets){
    const name = label.split(' ')[0], role = roleOf(name);
    if (!role) continue;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`${/^[.@]/.test(name) ? '' : '(?<![\\w.])'}${esc}(?!\\w)`).test(code)) continue;
    const shown = name.replace(/^self\./, '');
    if (!(out[role] ||= []).includes(shown)) out[role].push(shown);
  }
  return out;
}

// [{ role, a, b }]: what each side writes for a part and the other does not,
// in the parts' order. A side with nothing of its own there shows what it
// shares; one that writes nothing for it says `none`.
export function differs(a, b, { none = 'none' } = {}){
  return ORDER.map(role => {
    const x = a[role] || [], y = b[role] || [];
    const onlyA = x.filter(n => !y.includes(n)), onlyB = y.filter(n => !x.includes(n));
    if (!onlyA.length && !onlyB.length) return null;
    const fill = (only, mine) => (only.length ? only : mine.length ? mine : [none]);
    return { role, a: fill(onlyA, x), b: fill(onlyB, y) };
  }).filter(Boolean);
}

// [{ role, a }]: what one side writes for each part, for a side shown alone
export const used = terms => ORDER.filter(role => terms[role]?.length).map(role => ({ role, a: terms[role] }));
