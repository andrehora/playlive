// Shareable links: the hash is the mode, then the example, left out when it is
// the mode's first. Reading a hash and writing one are both string work, so
// they are read here; that a pasted link really opens that example in that mode
// is what modes.spec and app.spec drive in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { siteFromHash, modeFromHash, linkedMode, labFromHash, shareUrl } = await load('src/share.js');
const { PY_IDS } = await load('examples/python/examples.js');
const { JS_IDS } = await load('examples/javascript/examples.js');
const { MODES } = await load('src/modes.js');
const { SITE_IDS } = await load('examples/html/examples.js');

const HOME = SITE_IDS[0];
const OTHER = SITE_IDS[1];

/* ---------- Reading a link ---------- */

test('a site is named after "#html", and Create after "#html-create"', () => {
  assert.equal(modeFromHash(`#html#${OTHER}`), 'explore');
  assert.equal(siteFromHash(`#html#${OTHER}`), OTHER);
  assert.equal(modeFromHash('#html'), 'explore');
  assert.equal(siteFromHash('#html'), null);
  assert.equal(modeFromHash(`#html-create#${OTHER}`), 'create');
  assert.equal(siteFromHash(`#html-create#${OTHER}`), OTHER);
  assert.equal(modeFromHash('#html-create'), 'create');
});

test('a code mode is named, then its own example', () => {
  for (const m of ['python', 'python-create']) {
    assert.equal(modeFromHash(`#${m}#${PY_IDS[2]}`), m);
    assert.equal(labFromHash(`#${m}#${PY_IDS[2]}`), PY_IDS[2]);
  }
  for (const m of ['javascript', 'javascript-create']) {
    assert.equal(modeFromHash(`#${m}#${JS_IDS[2]}`), m);
    assert.equal(labFromHash(`#${m}#${JS_IDS[2]}`), JS_IDS[2]);
  }
  assert.equal(labFromHash('#python'), null);
  assert.equal(siteFromHash(`#python#${OTHER}`), null, 'a site is not a Python example');
});

test('an example the mode does not have is its first', () => {
  assert.equal(modeFromHash('#html#create'), 'explore');
  assert.equal(siteFromHash('#html#create'), null);
  assert.equal(modeFromHash('#javascript#no-such-example'), 'javascript');
  assert.equal(labFromHash('#javascript#no-such-example'), null);
});

test('a slash after the hash and stray space are ignored', () => {
  assert.equal(siteFromHash(`#/html#${OTHER}`), OTHER);
  assert.equal(siteFromHash(`#html#${OTHER} `), OTHER);
});

test('any other hash names nothing, and opens home', () => {
  for (const hash of ['', '#', `#${OTHER}`, '#explore', '#create', `#create#${OTHER}`, '#html_create',
    `#${PY_IDS[2]}`, '#mutation', '#smells', '#brainstorm', `#${OTHER}#html`]) {
    assert.equal(modeFromHash(hash), null, hash);
    assert.equal(siteFromHash(hash), null, hash);
    assert.equal(labFromHash(hash), null, hash);
    assert.equal(linkedMode(hash), 'python', hash);
  }
});

test('a percent-encoded hash is decoded, and a broken one does not throw', () => {
  assert.equal(siteFromHash(`#html#${encodeURIComponent(OTHER)}`), OTHER);
  assert.equal(siteFromHash('#html#%E0%A4%A'), null);
});

/* ---------- Writing one ---------- */

test('home is Python on its first example: "/" or "#python"', () => {
  assert.equal(MODES[0], 'python');
  assert.equal(new URL(shareUrl(HOME, 'python', PY_IDS[0])).hash, '#python');
  assert.equal(linkedMode(''), 'python');
  assert.equal(linkedMode('#python'), 'python');
  assert.equal(linkedMode(`#python#${PY_IDS[0]}`), 'python');
});

test('every place names its mode, and the example unless it is the first', () => {
  assert.equal(new URL(shareUrl(OTHER, 'explore')).hash, `#html#${OTHER}`);
  assert.equal(new URL(shareUrl(HOME, 'explore')).hash, '#html');
  assert.equal(new URL(shareUrl(HOME, 'create')).hash, '#html-create');
  assert.equal(new URL(shareUrl(OTHER, 'create')).hash, `#html-create#${OTHER}`);
  assert.equal(new URL(shareUrl(OTHER, 'python', PY_IDS[2])).hash, `#python#${PY_IDS[2]}`);
  assert.equal(new URL(shareUrl(OTHER, 'python-create', PY_IDS[0])).hash, '#python-create');
  assert.equal(new URL(shareUrl(OTHER, 'javascript', JS_IDS[0])).hash, '#javascript');
  assert.equal(new URL(shareUrl(OTHER, 'javascript-create', JS_IDS[2])).hash, `#javascript-create#${JS_IDS[2]}`);
});

test('the link drops index.html', () => {
  assert.doesNotMatch(shareUrl(OTHER, 'explore'), /index\.html/);
});

test('what a link says is what reading it back gives', () => {
  for (const m of ['explore', 'create']) for (const id of [HOME, OTHER]){
    const { hash } = new URL(shareUrl(id, m));
    assert.equal(siteFromHash(hash) || HOME, id, `${m} ${id}`);
    assert.equal(linkedMode(hash), m, `${m} ${id}`);
  }
  for (const m of ['python', 'python-create', 'javascript', 'javascript-create']) {
    const ids = m.startsWith('python') ? PY_IDS : JS_IDS;
    for (const ex of [ids[0], ids[2]]) {
      const { hash } = new URL(shareUrl(OTHER, m, ex));
      assert.equal(linkedMode(hash), m, `${m} ${ex}`);
      assert.equal(labFromHash(hash) || ids[0], ex, `${m} ${ex}`);
    }
  }
});

/* ---------- The modes themselves ---------- */

test('the modes run in the order the bar shows them', () => {
  assert.deepEqual(MODES, ['python', 'python-create', 'javascript', 'javascript-create', 'explore', 'create']);
  assert.equal(MODES[0], 'python', 'the default, so the one "/" opens');
});
