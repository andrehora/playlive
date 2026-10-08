/* ---------- Source maps, read for one thing ----------
   For each line of a compiled file, the line it was compiled from, so a stack
   trace through compiled TypeScript can name the line that was written. Pure,
   so the unit tests can read it; jsworker.js is its one user.             */
// A source map's mappings: for each line of the output (from 0), the first
// line of the source it came from. Base64 VLQ, as the spec has it.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function lineMap(mappings){
  const out = [];
  let source = 0;
  mappings.split(';').forEach((group, gen) => {
    for (const seg of group.split(',')){
      if (!seg) continue;
      const v = [];
      let value = 0, shift = 0;
      for (const ch of seg){
        const d = B64.indexOf(ch);
        value += (d & 31) << shift;
        if (d & 32){ shift += 5; continue; }
        v.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0; shift = 0;
      }
      if (v.length < 4) continue;
      source += v[2];
      out[gen] ??= source;
    }
  });
  return out;
}
