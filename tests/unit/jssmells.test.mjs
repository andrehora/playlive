// JS/TS test smells, read on tokens: the site modes' four, in Jasmine and
// Mocha files. That the Smells tab shows them is javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { smellsOf, ROULETTE } = await load('src/code/js/smells.js');
const found = src => smellsOf(src).items.map(i => [i.smell, i.what, i.line, i.detail]);

test('a test with no check of its own is an Unknown Test, and a helper that checks counts', () => {
  const src = 'const check = v => {\n  expect(v).toBe(1);\n};\ndescribe("A", () => {\n  it("runs", () => {\n    f();\n  });\n  it("checks", () => {\n    check(f());\n  });\n});\n';
  assert.deepEqual(found(src), [['unknown-test', 'runs', 4, 'runs its code and checks nothing']]);
});

test('more than ROULETTE checks in one test is Assertion Roulette', () => {
  const body = n => Array.from({ length: n }, (_, i) => `  expect(f(${i})).to.equal(${i});`).join('\n');
  assert.deepEqual(found(`it("many", () => {\n${body(ROULETTE + 1)}\n});\n`), [['assertion-roulette', 'many', 0, '6 checks in one test']]);
  assert.deepEqual(found(`it("enough", () => {\n${body(ROULETTE)}\n});\n`), []);
});

test('every test of a describe opening the same way is Duplication of Setup, up to the first check', () => {
  const src = 'describe("Cart", () => {\n  it("a", () => {\n    const c = new Cart();\n    c.add(1);\n    expect(c.n).toBe(1);\n  });\n'
    + '  it("b", () => {\n    const c = new Cart();\n    c.add(1);\n    expect(c.total).toBe(1);\n  });\n});\n';
  assert.deepEqual(found(src), [
    ['duplication-of-setup', 'const c = new Cart();', 2, 'at the start of all 2 tests in Cart'],
    ['duplication-of-setup', 'c.add(1);', 3, 'at the start of all 2 tests in Cart']
  ]);
  assert.deepEqual(found('describe("A", () => {\n  it("a", () => {\n    expect(1).toBe(1);\n  });\n  it("b", () => {\n    expect(1).toBe(1);\n  });\n});\n'), [], 'the same check is the test, not setup');
  assert.deepEqual(found('describe("A", () => {\n  it("a", () => {\n    const c = 1;\n    expect(c).toBe(1);\n  });\n});\n'), [], 'one test shares with nobody');
});

test('a beforeEach value some test does without is a General Fixture', () => {
  const src = 'describe("A", () => {\n  let cart, user;\n  beforeEach(() => {\n    cart = new Cart();\n    user = "ana";\n  });\n'
    + '  it("adds", () => {\n    cart.add(1);\n    expect(cart.n).toBe(1);\n  });\n  it("greets", () => {\n    expect(greet(user)).toBe("hi ana");\n  });\n});\n';
  assert.deepEqual(found(src), [
    ['general-fixture', 'cart = new Cart();', 3, 'not used by 1 of 2 tests'],
    ['general-fixture', 'user = "ana";', 4, 'not used by 1 of 2 tests']
  ]);
});

test('a test that sets the value again first does without it too, unless it builds on it', () => {
  const head = 'describe("A", () => {\n  let n;\n  beforeEach(() => {\n    n = 1;\n  });\n';
  assert.deepEqual(found(head + '  it("a", () => {\n    n = 2;\n    expect(n).toBe(2);\n  });\n});\n'), [['general-fixture', 'n = 1;', 3, 'used by no test']]);
  assert.deepEqual(found(head + '  it("a", () => {\n    n = n + 1;\n    expect(n).toBe(2);\n  });\n});\n'), []);
});

test('General Fixture stays silent when the rest of the setup, or a helper, might use the value', () => {
  const built = 'describe("A", () => {\n  let a, b;\n  beforeEach(() => {\n    a = 1;\n    b = a + 1;\n  });\n  it("b", () => {\n    expect(b).toBe(2);\n  });\n});\n';
  assert.deepEqual(found(built), [], 'b is built from a, so a test of b needs a');
  const helper = 'function use() { return n; }\ndescribe("A", () => {\n  let n;\n  beforeEach(() => {\n    n = 1;\n  });\n  it("a", () => {\n    expect(use()).toBe(1);\n  });\n});\n';
  assert.deepEqual(found(helper), [], 'a test calling a function of the file is not counted');
  const after = 'describe("A", () => {\n  let n;\n  beforeEach(() => {\n    n = 1;\n  });\n  afterEach(() => {\n    n.close();\n  });\n  it("a", () => {\n    expect(1).toBe(1);\n  });\n});\n';
  assert.deepEqual(found(after), [], 'afterEach reads it');
});

test('tests written in a loop count, and nested describes inherit the beforeEach', () => {
  const src = 'describe("A", () => {\n  for (const n of [1, 2]) {\n    it(`n ${n}`, () => {\n      expect(n).toBeTruthy();\n    });\n  }\n});\n';
  assert.equal(smellsOf(src).tests, 1);
  const nested = 'describe("A", () => {\n  let n;\n  beforeEach(() => {\n    n = 1;\n  });\n  describe("B", () => {\n    it("a", () => {\n      expect(n).toBe(1);\n    });\n  });\n});\n';
  assert.deepEqual(found(nested), []);
});

test('a file that does not tokenize, or whose brackets do not close, reads as nothing', () => {
  assert.equal(smellsOf('describe("A", () => {\n  it("a", () => {\n'), null);
});
