// Syntax-check a batch of generated modules in one process.
//
// The exports are ES modules, so `node --check` is the obvious tool — but it
// takes one file at a time, and spawning it once per example cost more than
// every other unit test put together. This parses each one without running it,
// which is the same question asked once instead of two hundred times.
//
// Input is a JSON array of { label, code } on stdin; output is a JSON array of
// the ones that did not parse.
import { SourceTextModule } from 'node:vm';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const bad = [];
for (const { label, code } of JSON.parse(Buffer.concat(chunks).toString('utf8'))){
  try { new SourceTextModule(code); }
  catch (e) { bad.push({ label, message: e.message }); }
}
process.stdout.write(JSON.stringify(bad));
