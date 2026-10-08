import { escH } from './util.js';

/* ---------- Colouring code, one regular expression at a time ----------
   The code modes' editors colour Python and JavaScript the same way: one
   regular expression whose groups are, in order, a comment, a string, a
   number, a decorator and a name. A name is a keyword, the name a definition
   gives (the word after `def`, `function` or `class`), or plain. Tokens are
   read across the whole text, since a string or a comment may span lines, and
   split back into lines after: one HTML string per line. */
export function highlighter({ token, keywords, defines }){
  return text => {
    const lines = [''];
    const push = (s, cls) => s.split('\n').forEach((part, i) => {
      if (i) lines.push('');
      if (part) lines[lines.length - 1] += cls ? `<i class="${cls}">${escH(part)}</i>` : escH(part);
    });
    let last = 0, prev = '';
    for (const m of text.matchAll(token)){
      const [tok, com, str, num, dec, id] = m;
      push(text.slice(last, m.index));
      push(tok, com ? 'c' : str ? 's' : num ? 'n' : dec ? 'o'
        : keywords.has(id) ? 'k' : defines.has(prev) ? 'f' : '');
      prev = id || '';
      last = m.index + tok.length;
    }
    push(text.slice(last));
    return lines;
  };
}
