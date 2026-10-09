import { JS_ACCENT, JS_EXAMPLES, JS_IDS } from '../../../examples/javascript/examples.js';
import { highlighter } from '../highlight.js';
import { smellsOf } from './smells.js';

/* ---------- JS/TS mode's profile: what code/code.js needs to know about JavaScript ----------

   The tests run in a worker (code/js/worker.js) on the framework's own runner,
   fetched when the mode is entered. A worker is cheap to start, so every run
   gets a fresh one. Every example's tests are written once per framework,
   Jasmine (the default) first. Every run also measures which lines of the
   code ran (code/js/cover.js), for the Coverage check.                            */
const EXT = { js: 'js', ts: 'ts' };
const SUFFIX = { jasmine: 'spec', mocha: 'test' };
export const filesFor = (id, fw, lang = 'js') => ({ code: `${id}.${EXT[lang]}`, tests: `${id}.${SUFFIX[fw]}.${EXT[lang]}` });

/* ---------- Highlighting: JavaScript and TypeScript ---------- */
const KEYWORDS = new Set(('async await break case catch class const continue debugger default delete do else export '
  + 'extends false finally for function if import in instanceof let new null of return static super switch this throw '
  + 'true try typeof undefined var void while yield abstract as declare enum implements interface keyof namespace '
  + 'private protected public readonly type').split(' '));
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?n?\b)|(@[\w.]+)|([A-Za-z_$][\w$]*)/g;
export const hlJs = highlighter({ token: TOKEN, keywords: KEYWORDS, defines: new Set(['function', 'class']) });

/* ---------- Reading the runners ---------- */
// How a console line reads: a pass, a failure, or a summary of either
export function consoleClass(line){
  if (/^\s*[✓✔]/.test(line) || /^\d+ specs?, 0 failures/.test(line) || /^\s*\d+ passing\b/.test(line)) return 'ok';
  if (/^\s*✗/.test(line) || /^\s*\d+\) /.test(line) || /^\d+ specs?, [1-9]\d* failures?/.test(line)
    || /^\s*\d+ failing\b/.test(line) || /^\s*(\w*Error|Expected)\b/.test(line)) return 'bad';
  return '';
}

/* ---------- Finding the tests ---------- */
// The tests a file defines, in order: each it(...), named by the describe(...)
// blocks around it, which are told apart by how far they are indented. A title
// written with ${...} is listed as written until a run names each case. Lines
// count from 0; ids are written the way the worker reports them.
export function testsInJs(text, file){
  const out = [], open = [];
  text.split('\n').forEach((l, line) => {
    const m = /^(\s*)[xf]?(describe|it|test)(?:\.only|\.skip)?\s*\(\s*(["'`])((?:\\.|(?!\3).)*)\3/.exec(l);
    if (!m) return;
    const indent = m[1].length;
    while (open.length && open.at(-1).indent >= indent) open.pop();
    if (m[2] === 'describe') open.push({ indent, title: m[4] });
    else out.push({ id: `${file}::${[...open.map(o => o.title), m[4]].join(' > ')}`, name: m[4], line });
  });
  return out;
}

/* ---------- Create: the file you start from ----------
   The lines that bring in the code and the framework's checks, so the file
   runs from the start, then the title of each test it ships, once, as a
   comment: the titles are the whole brief. A test is matched by its own
   title, whichever describe it is in. */
export function skeletonOf(text, file){
  const imports = text.split('\n').filter(l => /^(import\b|(const|let|var)\s[^=]*=\s*require\()/.test(l));
  const names = [...new Set(testsInJs(text, file).map(t => t.name))];
  return `${imports.join('\n')}${imports.length ? '\n\n' : ''}${names.map(n => `// ${n}`).join('\n\n')}\n`;
}

/* ---------- Snippets: what the editor offers while you write a test ----------
   See code/snippets.js for the format. Both frameworks share the blocks; Jasmine's
   checks are matchers on expect(…), Chai's are chains on it. Only the import
   lines differ between JavaScript (require) and TypeScript (import). */
const BLOCKS = [
  { label: 'describe', start: true, detail: 'a group of tests', body: 'describe("${1:thing}", () => {\n  $0\n});' },
  { label: 'it', also: ['test'], start: true, detail: 'a test', body: 'it("${1:does something}", () => {\n  $0\n});' },
  { label: 'beforeEach', start: true, detail: 'runs before each test', body: 'beforeEach(() => {\n  $0\n});' },
  { label: 'afterEach', start: true, detail: 'runs after each test', body: 'afterEach(() => {\n  $0\n});' },
];
const requireLine = (lang, names, from) => (lang === 'ts'
  ? `import { ${names} } from "${from}";\n$0`
  : `const { ${names} } = require("${from}");\n$0`);
const JASMINE = (lang, from) => [
  ...BLOCKS,
  { label: 'beforeAll', start: true, detail: 'runs once, before the tests', body: 'beforeAll(() => {\n  $0\n});' },
  { label: 'afterAll', start: true, detail: 'runs once, after the tests', body: 'afterAll(() => {\n  $0\n});' },
  { label: 'xit', start: true, detail: 'a test, skipped', body: 'xit("${1:does something}", () => {\n  $0\n});' },
  { label: lang === 'ts' ? 'import' : 'require', start: true, detail: 'the code under test', body: requireLine(lang, '${1:name}', from) },
  { label: 'expect', detail: 'a check', body: 'expect(${1:actual}).toBe(expected);' },
  { label: 'expect toThrowError', detail: 'the call throws', body: 'expect(() => ${1:call()}).toThrowError(Error);' },
  { label: 'spyOn', detail: 'replace a method in this test', body: 'spyOn(${1:object}, "method").and.returnValue(value);' },
  { label: '.toBe', detail: '=== expected', body: '.toBe(${1:expected})' },
  { label: '.toEqual', detail: 'same contents', body: '.toEqual(${1:expected})' },
  { label: '.toBeTrue', detail: '=== true', body: '.toBeTrue()' },
  { label: '.toBeFalse', detail: '=== false', body: '.toBeFalse()' },
  { label: '.toBeTruthy', detail: 'truthy', body: '.toBeTruthy()' },
  { label: '.toBeFalsy', detail: 'falsy', body: '.toBeFalsy()' },
  { label: '.toBeNull', detail: '=== null', body: '.toBeNull()' },
  { label: '.toBeUndefined', detail: '=== undefined', body: '.toBeUndefined()' },
  { label: '.toBeDefined', detail: '!== undefined', body: '.toBeDefined()' },
  { label: '.toContain', detail: 'has the item', body: '.toContain(${1:item})' },
  { label: '.toMatch', detail: 'matches the pattern', body: '.toMatch(/${1:pattern}/)' },
  { label: '.toBeCloseTo', detail: 'equal to some places', body: '.toBeCloseTo(${1:expected}, 2)' },
  { label: '.toBeGreaterThan', detail: '> n', body: '.toBeGreaterThan(${1:n})' },
  { label: '.toBeLessThan', detail: '< n', body: '.toBeLessThan(${1:n})' },
  { label: '.toHaveSize', detail: 'length or size', body: '.toHaveSize(${1:n})' },
  { label: '.toThrow', detail: 'the function throws', body: '.toThrow()' },
  { label: '.toThrowError', detail: 'throws this error', body: '.toThrowError(${1:Error})' },
  { label: '.toHaveBeenCalled', detail: 'the spy was called', body: '.toHaveBeenCalled()' },
  { label: '.toHaveBeenCalledWith', detail: 'called with these', body: '.toHaveBeenCalledWith(${1:args})' },
  { label: '.not', detail: 'the opposite', body: '.not' },
];
const MOCHA = (lang, from) => [
  ...BLOCKS,
  { label: 'before', start: true, detail: 'runs once, before the tests', body: 'before(() => {\n  $0\n});' },
  { label: 'after', start: true, detail: 'runs once, after the tests', body: 'after(() => {\n  $0\n});' },
  { label: 'it.skip', start: true, detail: 'a test, skipped', body: 'it.skip("${1:does something}", () => {\n  $0\n});' },
  { label: 'chai', start: true, detail: 'Chai\'s expect', body: requireLine(lang, 'expect', 'chai') },
  { label: 'sinon', start: true, detail: 'Sinon, to replace things', body: lang === 'ts' ? 'import * as sinon from "sinon";\n$0' : 'const sinon = require("sinon");\n$0' },
  { label: 'sinon.stub', detail: 'replace a method in this test', body: 'sinon.stub(${1:object}, "method").returns(value);' },
  { label: 'sinon.restore', detail: 'put back what was replaced', body: 'sinon.restore();' },
  { label: lang === 'ts' ? 'import' : 'require', start: true, detail: 'the code under test', body: requireLine(lang, '${1:name}', from) },
  { label: 'expect', detail: 'a check', body: 'expect(${1:actual}).to.equal(expected);' },
  { label: 'expect to.throw', detail: 'the call throws', body: 'expect(() => ${1:call()}).to.throw(Error);' },
  { label: '.to.equal', detail: '=== expected', body: '.to.equal(${1:expected})' },
  { label: '.to.deep.equal', detail: 'same contents', body: '.to.deep.equal(${1:expected})' },
  { label: '.to.be.true', detail: '=== true', body: '.to.be.true' },
  { label: '.to.be.false', detail: '=== false', body: '.to.be.false' },
  { label: '.to.be.ok', detail: 'truthy', body: '.to.be.ok' },
  { label: '.to.be.null', detail: '=== null', body: '.to.be.null' },
  { label: '.to.be.undefined', detail: '=== undefined', body: '.to.be.undefined' },
  { label: '.to.exist', detail: 'not null or undefined', body: '.to.exist' },
  { label: '.to.include', detail: 'has the item', body: '.to.include(${1:item})' },
  { label: '.to.match', detail: 'matches the pattern', body: '.to.match(/${1:pattern}/)' },
  { label: '.to.be.closeTo', detail: 'equal, give or take', body: '.to.be.closeTo(${1:expected}, 0.001)' },
  { label: '.to.be.above', detail: '> n', body: '.to.be.above(${1:n})' },
  { label: '.to.be.below', detail: '< n', body: '.to.be.below(${1:n})' },
  { label: '.to.have.lengthOf', detail: 'length is n', body: '.to.have.lengthOf(${1:n})' },
  { label: '.to.be.a', detail: 'of this type', body: '.to.be.a("${1:string}")' },
  { label: '.to.be.instanceOf', detail: 'made by this class', body: '.to.be.instanceOf(${1:Class})' },
  { label: '.to.throw', detail: 'the function throws', body: '.to.throw(${1:Error})' },
  { label: '.to.not.equal', detail: '!== expected', body: '.to.not.equal(${1:unexpected})' },
];
// `id` is the example, whose module the import line names
export const snippetsFor = (fw, lang = 'js', id = 'module') => (fw === 'mocha' ? MOCHA : JASMINE)(lang, `./${id}`);

export const JAVASCRIPT = {
  runtime: fw => (fw === 'mocha' ? 'Mocha' : 'Jasmine'), title: 'JS/TS',
  // What runs the tests, language first: JavaScript's version is the browser's
  label: (v, fw, lang) => `${lang === 'ts' ? `TypeScript ${v.typescript}` : `JavaScript (${v.browser})`} · `
    + (fw === 'mocha' ? `Mocha ${v.mocha} + Chai ${v.chai} + Sinon ${v.sinon}` : `Jasmine ${v.jasmine}`),
  examples: JS_EXAMPLES, ids: JS_IDS, accent: JS_ACCENT, icon: 'JavaScript',
  frameworks: [
    { id: 'jasmine', label: 'Jasmine', logo: 'jasmine', title: 'Tests with Jasmine' },
    { id: 'mocha', label: 'Mocha', logo: 'mocha', title: 'Tests with Mocha and Chai' }
  ],
  langs: [
    { id: 'js', label: 'JavaScript', logo: 'javascript', title: 'JavaScript' },
    { id: 'ts', label: 'TypeScript', logo: 'typescript', title: 'TypeScript (types not checked)' }
  ],
  codeTitle: lang => (lang === 'ts' ? 'TypeScript code' : 'JavaScript code'),
  files: filesFor,
  highlight: hlJs,
  testsIn: testsInJs,
  consoleClass,
  snippets: snippetsFor,
  comment: '//', indent: '  ', opensBlock: /[{[(]\s*(\/\/.*)?$/,
  emptyText: () => 'A test is an it("…", () => { … }) inside a describe("…", () => { … }).',
  worker: (fw, lang) => new Worker(new URL(`./worker.js?fw=${fw}&lang=${lang}`, import.meta.url), { type: 'module' }),
  fresh: true,
  mutation: true,
  // The site modes' four smells, said for Jasmine and Mocha, read here on the
  // page (code/js/smells.js) rather than by the worker
  smells: () => [
    { id: 'unknown-test', name: 'Unknown Test', why: 'Checks nothing. Add an expect.' },
    { id: 'assertion-roulette', name: 'Assertion Roulette', why: 'So many checks that a failing one says little. Keep the checks that say what the test is for.' },
    { id: 'duplication-of-setup', name: 'Duplication of Setup', why: 'Every test starts the same way. Move those lines to beforeEach.' },
    { id: 'general-fixture', name: 'General Fixture', why: 'Keep in beforeEach only what every test uses.' }
  ],
  smellsOf,
  create: true,
  skeleton: skeletonOf,
  nameOf: t => t.name
};
