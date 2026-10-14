import { examplesFor } from '../../../examples/code.js';
import { highlighter } from '../highlight.js';

/* ---------- Python mode's profile: what code/code.js needs to know about Python ----------

   Python is Pyodide, which is CPython compiled to WebAssembly, run in a worker
   (code/python/worker.js) that is only fetched when the mode is entered. It is slow to
   start, so it is kept for the next run rather than started afresh. Every
   example's tests are written twice, with pytest (the default) and with
   unittest, and each runs on its own runner. Every run also measures which
   lines of the code ran (code/python/worker.js), for the Coverage check.               */
export const moduleOf = id => id.replace(/-/g, '_');
export const filesFor = id => ({ code: `${moduleOf(id)}.py`, tests: `test_${moduleOf(id)}.py` });

/* ---------- Highlighting ---------- */
const KEYWORDS = new Set(('False None True and as assert async await break case class continue def del elif else '
  + 'except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield').split(' '));
const TOKEN = /(#[^\n]*)|((?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?)|(@[\w.]+)|([A-Za-z_]\w*)/g;
export const hlPython = highlighter({ token: TOKEN, keywords: KEYWORDS, defines: new Set(['def', 'class']) });

/* ---------- Reading the runners ---------- */
// How a console line reads, in either runner's words: a pass, a failure, or
// (pytest's ">") the line a traceback points at.
export function consoleClass(line){
  if (/^E\s/.test(line) || /\b(FAILED|ERROR)\b/.test(line) || /\.\.\. FAIL$|^FAIL:/.test(line)) return 'bad';
  if (/\bPASSED\b/.test(line) || /\.\.\. ok$|^OK\b/.test(line)) return 'ok';
  if (/^>/.test(line)) return 'at';
  return '';
}

/* ---------- Finding the tests ---------- */
// The tests a file defines, in order: functions named test*, at the top level,
// or methods named test* of a class named Test* or based on a TestCase. Lines
// count from 0. Ids are written the way both runners report them.
export function testsInFile(text, file){
  const out = [];
  let cls = null;
  text.split('\n').forEach((l, line) => {
    let m;
    if ((m = /^class (Test\w*|\w+(?=\s*\([^)]*TestCase))/.exec(l))) cls = m[1];
    else if (/^\S/.test(l)) cls = null;
    if ((m = /^(?:async )?def (test\w*)\s*\(/.exec(l))) out.push({ id: `${file}::${m[1]}`, name: m[1], line });
    else if (cls && (m = /^\s+(?:async )?def (test\w*)\s*\(/.exec(l))) out.push({ id: `${file}::${cls}::${m[1]}`, name: m[1], line });
  });
  return out;
}

/* ---------- Create: the file you start from ----------
   The example's imports, so the file runs from the start, then the name of
   each test it ships, once, as a comment: the names are the whole brief, as
   the titles are in the site modes' Create. Lines continued in brackets stay
   with their import. */
export function skeletonOf(text, file){
  const lines = text.split('\n'), imports = [];
  for (let i = 0, open = 0; i < lines.length; i++){
    const l = lines[i];
    if (open || /^(import|from)\s/.test(l)){
      imports.push(l);
      open = Math.max(0, open + (l.match(/\(/g) || []).length - (l.match(/\)/g) || []).length);
    }
  }
  const names = [...new Set(testsInFile(text, file).map(t => t.name))];
  return `${imports.join('\n')}${imports.length ? '\n\n\n' : ''}${names.map(n => `# ${n}`).join('\n\n')}\n`;
}

/* ---------- Snippets: what the editor offers while you write a test ----------
   See code/snippets.js for the format. unittest asserts are methods of the test
   case; pytest uses the plain assert, and pytest's helpers. */
const UNITTEST = [
  { label: 'test', start: true, detail: 'a test method', body: 'def test_${1:name}(self):\n    $0' },
  { label: 'class TestCase', start: true, detail: 'a class of tests', body: 'class ${1:Thing}Test(unittest.TestCase):\n    def test_${2:name}(self):\n        $0' },
  { label: 'setUp', start: true, detail: 'runs before each test', body: 'def setUp(self):\n    $0' },
  { label: 'tearDown', start: true, detail: 'runs after each test', body: 'def tearDown(self):\n    $0' },
  { label: 'import unittest', start: true, detail: 'the framework', body: 'import unittest\n$0' },
  { label: 'from unittest.mock import patch', start: true, detail: 'to replace things in a test', body: 'from unittest.mock import patch\n$0' },
  { label: 'unittest.main', start: true, detail: 'run the file\'s tests', body: 'if __name__ == "__main__":\n    unittest.main()\n$0' },
  { label: '@unittest.skip', start: true, detail: 'skip the test below', body: '@unittest.skip("${1:reason}")' },
  { label: 'self.assertEqual', detail: 'a == b', body: 'self.assertEqual(${1:actual}, expected)' },
  { label: 'self.assertNotEqual', detail: 'a != b', body: 'self.assertNotEqual(${1:actual}, unexpected)' },
  { label: 'self.assertTrue', detail: 'bool(x) is True', body: 'self.assertTrue(${1:value})' },
  { label: 'self.assertFalse', detail: 'bool(x) is False', body: 'self.assertFalse(${1:value})' },
  { label: 'self.assertIs', detail: 'a is b', body: 'self.assertIs(${1:actual}, expected)' },
  { label: 'self.assertIsNone', detail: 'x is None', body: 'self.assertIsNone(${1:value})' },
  { label: 'self.assertIsNotNone', detail: 'x is not None', body: 'self.assertIsNotNone(${1:value})' },
  { label: 'self.assertIn', detail: 'a in b', body: 'self.assertIn(${1:member}, container)' },
  { label: 'self.assertNotIn', detail: 'a not in b', body: 'self.assertNotIn(${1:member}, container)' },
  { label: 'self.assertIsInstance', detail: 'isinstance(a, b)', body: 'self.assertIsInstance(${1:value}, Type)' },
  { label: 'self.assertAlmostEqual', detail: 'equal to 7 places', body: 'self.assertAlmostEqual(${1:actual}, expected)' },
  { label: 'self.assertGreater', detail: 'a > b', body: 'self.assertGreater(${1:actual}, bound)' },
  { label: 'self.assertLess', detail: 'a < b', body: 'self.assertLess(${1:actual}, bound)' },
  { label: 'self.assertCountEqual', detail: 'same items, any order', body: 'self.assertCountEqual(${1:actual}, expected)' },
  { label: 'self.assertRaises', detail: 'the block raises', body: 'with self.assertRaises(${1:ValueError}):\n    $0' },
  { label: 'self.assertRaisesRegex', detail: 'raises, with this message', body: 'with self.assertRaisesRegex(${1:ValueError}, "message"):\n    $0' },
  { label: 'self.subTest', detail: 'one case of many', body: 'with self.subTest(${1:case=case}):\n    $0' },
  { label: 'patch.object', detail: 'replace an attribute', body: 'with patch.object(${1:module}, "name", return_value=value):\n    $0' },
];
const PYTEST = [
  { label: 'test', start: true, detail: 'a test function', body: 'def test_${1:name}():\n    $0' },
  { label: 'import pytest', start: true, detail: 'the framework', body: 'import pytest\n$0' },
  { label: '@pytest.fixture', start: true, detail: 'a fresh value for each test', body: '@pytest.fixture\ndef ${1:name}():\n    return $0' },
  { label: '@pytest.mark.parametrize', start: true, detail: 'one test, many cases', body: '@pytest.mark.parametrize("${1:value}, expected", [\n    ($0),\n])' },
  { label: '@pytest.mark.skip', start: true, detail: 'skip the test below', body: '@pytest.mark.skip(reason="${1:why}")' },
  { label: 'assert', detail: 'a == b', body: 'assert ${1:actual} == expected' },
  { label: 'assert not', detail: 'x is falsy', body: 'assert not ${1:value}' },
  { label: 'assert in', detail: 'a in b', body: 'assert ${1:member} in container' },
  { label: 'assert is None', detail: 'x is None', body: 'assert ${1:value} is None' },
  { label: 'pytest.raises', detail: 'the block raises', body: 'with pytest.raises(${1:ValueError}):\n    $0' },
  { label: 'pytest.raises match', detail: 'raises, with this message', body: 'with pytest.raises(${1:ValueError}, match="message"):\n    $0' },
  { label: 'pytest.approx', detail: 'equal, give or take', body: 'pytest.approx(${1:expected})' },
  { label: 'tmp_path', detail: 'an empty folder for the test', body: 'tmp_path' },
  { label: 'monkeypatch.setattr', detail: 'replace an attribute', body: 'monkeypatch.setattr(${1:module}, "name", value)' },
];
// `id` is the example, whose module the import line names
export const snippetsFor = (fw, lang, id = 'module') => [
  { label: `from ${moduleOf(id)} import`, start: true, detail: 'the code under test', body: `from ${moduleOf(id)} import \${1:name}\n$0` },
  ...(fw === 'pytest' ? PYTEST : UNITTEST)
];

/* ---------- What a test does, read off its lines ----------
   The goals of Practice (code/practice.js) ask which tests do something, in
   words for any framework; how each framework writes it is said here.      */
// The tests of a file whose own lines (the def's, and those indented under it) match `re`
function testsWith(text, file, re){
  const lines = text.split('\n'), indent = l => /^\s*/.exec(l)[0].length;
  return testsInFile(text, file).filter(t => {
    const own = indent(lines[t.line]);
    for (let j = t.line + 1; j < lines.length && (!lines[j].trim() || indent(lines[j]) > own); j++)
      if (re.test(lines[j])) return true;
    return false;
  });
}
// One test, run once per case: in pytest, a test under a parametrize mark; in
// unittest, one that runs its cases as subTests
export function parametrizedIn(text, file, fw){
  const lines = text.split('\n'), tests = testsInFile(text, file);
  if (fw === 'pytest'){
    // A mark decorates the next def below it
    const marked = new Set();
    lines.forEach((l, i) => {
      if (!/^\s*@[\w.]*parametrize\s*\(/.test(l)) return;
      const def = lines.findIndex((d, j) => j > i && /^\s*(?:async\s+)?def\s/.test(d));
      if (def >= 0) marked.add(def);
    });
    return tests.filter(t => marked.has(t.line));
  }
  return testsWith(text, file, /\.subTest\s*\(/);
}
// A test that starts from shared setup: in pytest, one that takes a fixture;
// in unittest, one of a class with setUp
export function setupIn(text, file, fw){
  const lines = text.split('\n'), tests = testsInFile(text, file);
  if (fw === 'pytest'){
    // A fixture is the def under a fixture mark
    const fixtures = new Set();
    lines.forEach((l, i) => {
      if (!/^\s*@(?:pytest\.)?fixture\b/.test(l)) return;
      const def = lines.slice(i + 1).map(d => /^\s*(?:async\s+)?def\s+(\w+)/.exec(d)).find(Boolean);
      if (def) fixtures.add(def[1]);
    });
    return tests.filter(t => paramsOf(/\(([^)]*)/.exec(lines[t.line])?.[1] ?? '').some(p => fixtures.has(p)));
  }
  const set = new Set();
  let cls = null;
  for (const l of lines){
    const m = /^class (\w+)/.exec(l);
    if (m) cls = m[1]; else if (/^\S/.test(l)) cls = null;
    if (cls && /^\s+def setUp(?:Class)?\s*\(/.test(l)) set.add(cls);
  }
  return tests.filter(t => set.has(t.id.split('::')[1]));
}
// The tests that check a result is true, and those that check one is false:
// in pytest, a bare assert (no comparison) or "is True", and "assert not" or
// "is False"; in unittest, assertTrue and assertFalse
export function truthsIn(text, file, fw){
  const [yes, no] = fw === 'pytest'
    ? [/^\s*assert\s+(?!not\b)(?:(?!==|!=|<|>|\bin\b|\bis\b).)+$|\bis\s+True\b/, /^\s*assert\s+not\b|\bis\s+False\b/]
    : [/\.assertTrue\s*\(/, /\.assertFalse\s*\(/];
  return { truthy: testsWith(text, file, yes), falsy: testsWith(text, file, no) };
}
// A test that expects an exception: pytest.raises, or unittest's assertRaises
export const raisesIn = (text, file, fw) =>
  testsWith(text, file, fw === 'pytest' ? /\bpytest\.raises\s*\(|(?:^|[^.\w])raises\s*\(/ : /\.assertRaises(?:Regex)?\s*\(/);

/* ---------- Calls: the functions the tests import, as snippets ----------
   Each function the tests file imports from the code under test ("from
   username import suggest", or "import username" for username.suggest) is
   offered by its name, and writes the call with the parameters its def names,
   the first selected to type over. Only functions defined at the top of the
   code, and only once imported, since a call to any other would not run. */
export function paramsOf(list){
  return list.split(',').map(p => p.trim().replace(/[:=].*$/s, '').trim())
    .filter(p => p && p !== 'self' && p !== '/' && p !== '*');
}
export function callsOf(code, tests, id){
  const module = moduleOf(id), defs = new Map();
  for (const m of code.matchAll(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm)) defs.set(m[1], paramsOf(m[2]));
  const named = [];                    // [what the tests call it, the def's name]
  const from = new RegExp(`^from\\s+${module}\\s+import\\s+(\\([^)]*\\)|[^\\n#]*)`, 'gm');
  for (const m of tests.matchAll(from))
    for (const part of m[1].replace(/[()]/g, '').split(',')){
      const [name, alias] = part.trim().split(/\s+as\s+/);
      if (name) named.push([alias || name, name]);
    }
  const whole = new RegExp(`^import\\s+${module}(?:\\s+as\\s+(\\w+))?\\s*$`, 'gm');
  for (const m of tests.matchAll(whole)) for (const name of defs.keys()) named.push([`${m[1] || module}.${name}`, name]);
  return named.filter(([, name]) => defs.has(name)).map(([label, name]) => {
    const ps = defs.get(name);
    return { label, detail: `(${ps.join(', ')})`, body: `${label}(${ps.map((p, i) => (i ? p : `\${1:${p}}`)).join(', ')})$0` };
  });
}

export const PYTHON = {
  runtime: 'Python', title: 'Python',
  // What runs the tests, language first: unittest is Python's own, with no version of its
  label: (v, fw) => `Python ${v.python} · ${fw === 'pytest' ? `pytest ${v.pytest}` : 'unittest'}`,
  frameworks: [
    { id: 'pytest', label: 'pytest', logo: 'pytest', title: 'Tests with pytest' },
    { id: 'unittest', label: 'unittest', logo: 'python', title: 'Tests with unittest' }
  ],
  langs: null,
  codeTitle: () => 'Python source',
  files: filesFor,
  highlight: hlPython,
  testsIn: testsInFile,
  consoleClass,
  snippets: snippetsFor,
  calls: callsOf,
  parametrizedIn, raisesIn, setupIn, truthsIn,
  comment: '#', indent: '    ', opensBlock: /:\s*(#.*)?$/,
  emptyText: fw => (fw === 'pytest'
    ? 'A test is a function whose name starts with test_.'
    : 'A test is a method whose name starts with test_, in a class based on unittest.TestCase.'),
  worker: () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }),
  fresh: false,
  mutation: true,
  // What a mutation can change (code/python/worker.js's mutants_of), each
  // with an example: [name, before, after]
  operators: [
    ['Relational', 'x < 10', 'x <= 10'],
    ['Equality', 'x == y', 'x != y'],
    ['Membership', 'x in items', 'x not in items'],
    ['Identity', 'x is None', 'x is not None'],
    ['Arithmetic', 'a + b', 'a - b'],
    ['Assignment', 'total += n', 'total -= n'],
    ['Logical', 'a and b', 'a or b'],
    ['Negation removed', 'not done', 'done'],
    ['Number', 'size = 8', 'size = 9'],
    ['Boolean', 'return True', 'return False'],
    ['Return value', 'return total', 'return None']
  ],
  // Create: the tests are named by their function, whatever class they are in
  create: true,
  skeleton: skeletonOf,
  nameOf: t => t.name,
  // The site modes' four smells, said for Python (code/python/worker.js finds them)
  smells: fw => [
    { id: 'unknown-test', name: 'Unknown Test', why: 'Checks nothing. Add an assert.' },
    { id: 'assertion-roulette', name: 'Assertion Roulette', why: 'So many checks that a failing one says little. Keep the checks that say what the test is for.' },
    { id: 'duplication-of-setup', name: 'Duplication of Setup', why: `Every test starts the same way. Move those lines to ${fw === 'pytest' ? 'a fixture' : 'setUp'}.` },
    { id: 'general-fixture', name: 'General Fixture', why: fw === 'pytest' ? 'Give a test only the fixtures it uses.' : 'Keep in setUp only what every test uses.' }
  ]
};
// The examples written for one of its frameworks, as { examples, ids }
Object.assign(PYTHON, examplesFor(PYTHON.frameworks.map(f => f.id)));
