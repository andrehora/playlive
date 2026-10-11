// The large tests' links: which names are the framework's, and what each
// searches for. That a click opens a new tab is in python.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { apisOf, linkApis, luckyUrl } = await load('src/code/apis.js');
const { hlPython, snippetsFor: py } = await load('src/code/python/python.js');
const { hlJs, snippetsFor: js } = await load('src/code/js/javascript.js');
const linked = (html, apis) => [...linkApis(html, apis).matchAll(/<a [^>]*href="([^"]+)"[^>]*>(\w+)<\/a>/g)]
  .map(([, href, w]) => [w, new URL(href.replace(/&amp;/g, '&')).searchParams.get('q')]);

test('an API searches for itself and the framework, as I\'m Feeling Lucky', () => {
  const apis = apisOf(py('unittest'), 'unittest');
  assert.equal(apis.get('assertTrue').query, 'assertTrue unittest');
  assert.equal(apis.get('setUp').query, 'setUp unittest');
  assert.equal(apisOf(py('pytest'), 'pytest').get('raises').query, 'pytest.raises pytest');
  assert.equal(apisOf(js('jasmine'), 'jasmine').get('spyOn').query, 'spyOn jasmine');
  assert.equal(apisOf(js('mocha'), 'mocha').get('equal').query, 'to.equal chai');
  assert.equal(apisOf(js('mocha'), 'mocha').get('stub').query, 'sinon.stub mocha');
  assert.equal(luckyUrl('assertTrue unittest'), 'https://www.google.com/search?btnI=1&q=assertTrue%20unittest');
  for (const w of ['self', 'import', 'unittest', 'to', 'be', 'not']) assert.ok(!apisOf(py('unittest'), 'unittest').has(w) && !apisOf(js('mocha'), 'mocha').has(w), w);
});

test('a line links the framework\'s names, never in a string or a comment', () => {
  const apis = apisOf(py('unittest'), 'unittest');
  const [line] = hlPython('        self.assertTrue(ok)  # assertTrue "assertEqual"');
  assert.deepEqual(linked(line, apis), [['assertTrue', 'assertTrue unittest']]);
  assert.deepEqual(linked(hlPython('    def setUp(self):')[0], apis), [['setUp', 'setUp unittest']]);
  // A name inside another is left alone
  assert.deepEqual(linked(hlPython('x = my_assertTrue(1)')[0], apis), []);
});

test('a member links only after a dot, so Chai\'s true does and a plain true does not', () => {
  const apis = apisOf(js('mocha'), 'mocha');
  assert.deepEqual(linked(hlJs('expect(ok).to.be.true;')[0], apis), [['expect', 'expect chai'], ['true', 'to.be.true chai']]);
  assert.deepEqual(linked(hlJs('return true;')[0], apis), []);
  assert.deepEqual(linked(hlJs('it("works", () => {')[0], apis), [['it', 'it mocha']]);
});
