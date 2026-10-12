// Compare's links: which names are the framework's, and what each searches
// for. That a click opens a new tab is in python.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { apisOf, luckyUrl } = await load('src/code/apis.js');
const { snippetsFor: py } = await load('src/code/python/python.js');
const { snippetsFor: js } = await load('src/code/js/javascript.js');

test('an API searches for itself on its library\'s documentation, as I\'m Feeling Lucky', () => {
  const apis = apisOf(py('unittest'), 'unittest');
  assert.equal(apis.get('assertTrue').query, 'assertTrue site:docs.python.org');
  assert.equal(apis.get('setUp').query, 'setUp site:docs.python.org');
  assert.equal(apisOf(py('pytest'), 'pytest').get('raises').query, 'pytest.raises site:docs.pytest.org');
  assert.equal(apisOf(js('jasmine'), 'jasmine').get('spyOn').query, 'spyOn site:jasmine.github.io');
  assert.equal(apisOf(js('mocha'), 'mocha').get('equal').query, 'to.equal site:chaijs.com');
  assert.equal(apisOf(js('mocha'), 'mocha').get('stub').query, 'sinon.stub site:sinonjs.org');
  // Jasmine's describe is the framework's, not the plant's
  assert.equal(apisOf(js('jasmine'), 'jasmine').get('describe').query, 'describe site:jasmine.github.io');
  assert.equal(luckyUrl('assertTrue unittest'), 'https://www.google.com/search?btnI=1&q=assertTrue%20unittest');
  for (const w of ['self', 'import', 'unittest', 'to', 'be', 'not']) assert.ok(!apisOf(py('unittest'), 'unittest').has(w) && !apisOf(js('mocha'), 'mocha').has(w), w);
});
