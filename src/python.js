import { PY_ACCENT, PY_EXAMPLES, PY_IDS, moduleOf } from '../examples/python/examples.js';
import { highlighter } from './highlight.js';

/* ---------- Python mode's profile: what lab.js needs to know about Python ----------

   Python is Pyodide, which is CPython compiled to WebAssembly, run in a worker
   (pyworker.js) that is only fetched when the mode is entered. It is slow to
   start, so it is kept for the next run rather than started afresh. Every
   example's tests are written twice, with pytest (the default) and with
   unittest, and each runs on its own runner. Every run also measures which
   lines of the code ran (pyworker.js), for the Coverage check.               */
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
   See snippets.js for the format. unittest asserts are methods of the test
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

export const PYTHON = {
  runtime: 'Python', title: 'Python',
  // What runs the tests, language first: unittest is Python's own, with no version of its
  label: (v, fw) => `Python ${v.python} · ${fw === 'pytest' ? `pytest ${v.pytest}` : 'unittest'}`,
  examples: PY_EXAMPLES, ids: PY_IDS, accent: PY_ACCENT, icon: 'Python',
  frameworks: [
    { id: 'pytest', label: 'pytest', logo: 'pytest', title: 'Tests with pytest' },
    { id: 'unittest', label: 'unittest', logo: 'python', title: 'Tests with unittest' }
  ],
  langs: null,
  codeTitle: () => 'Python code',
  files: filesFor,
  highlight: hlPython,
  testsIn: testsInFile,
  consoleClass,
  snippets: snippetsFor,
  comment: '#', indent: '    ', opensBlock: /:\s*(#.*)?$/,
  emptyText: fw => (fw === 'pytest'
    ? 'A test is a function whose name starts with test_.'
    : 'A test is a method whose name starts with test_, in a class based on unittest.TestCase.'),
  worker: () => new Worker(new URL('./pyworker.js', import.meta.url), { type: 'module' }),
  fresh: false,
  mutation: true,
  // Create: the tests are named by their function, whatever class they are in
  create: true,
  skeleton: skeletonOf,
  nameOf: t => t.name,
  // The site modes' four smells, said for Python (pyworker.js finds them)
  smells: fw => [
    { id: 'unknown-test', name: 'Unknown Test', why: 'Checks nothing. Add an assert.' },
    { id: 'assertion-roulette', name: 'Assertion Roulette', why: 'So many checks that a failing one says little. Keep the checks that say what the test is for.' },
    { id: 'duplication-of-setup', name: 'Duplication of Setup', why: `Every test starts the same way. Move those lines to ${fw === 'pytest' ? 'a fixture' : 'setUp'}.` },
    { id: 'general-fixture', name: 'General Fixture', why: fw === 'pytest' ? 'Give a test only the fixtures it uses.' : 'Keep in setUp only what every test uses.' }
  ]
};
