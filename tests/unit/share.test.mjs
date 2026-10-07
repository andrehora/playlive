// Shareable links: the mode and the example are the URL's hash, each half left
// out when it is the default. Reading a hash and writing one are both string
// work, so they are read here; that a pasted link really opens that example in
// that mode is what modes.spec and app.spec drive in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { siteFromHash, modeFromHash, shareUrl } = await load('src/share.js');
const { MODES } = await load('src/modes.js');
const { SITE_IDS } = await load('examples/examples.js');

const HOME = SITE_IDS[0];
const OTHER = SITE_IDS[1];

/* ---------- Reading a link ---------- */

test('an example in the hash is found', () => {
  assert.equal(siteFromHash(`#${OTHER}`), OTHER);
  assert.equal(siteFromHash(`#/${OTHER}`), OTHER, 'a slash after the hash is ignored');
  assert.equal(siteFromHash(`#${OTHER} `), OTHER, 'and so is stray space');
});

test('no hash, or one naming nothing, is no example', () => {
  assert.equal(siteFromHash(''), null);
  assert.equal(siteFromHash('#'), null);
  assert.equal(siteFromHash('#no-such-example'), null);
});

test('a mode in the hash is found, in either order', () => {
  assert.equal(modeFromHash('#create'), 'create');
  assert.equal(modeFromHash(`#create#${OTHER}`), 'create');
  assert.equal(modeFromHash(`#${OTHER}#create`), 'create');
  assert.equal(siteFromHash(`#create#${OTHER}`), OTHER);
});

test('a link from before modes existed still means what it did', () => {
  // Examples are looked at first, so an example cannot be read as a mode.
  assert.equal(siteFromHash(`#${OTHER}`), OTHER);
  assert.equal(modeFromHash(`#${OTHER}`), null);
});

test('a hash naming a mode that does not exist names no mode', () => {
  assert.equal(modeFromHash('#brainstorm'), null);
});

test('every mode is readable out of a hash', () => {
  for (const m of MODES) assert.equal(modeFromHash(`#${m}`), m);
});

test('a percent-encoded hash is decoded, and a broken one does not throw', () => {
  assert.equal(siteFromHash(`#${encodeURIComponent(OTHER)}`), OTHER);
  assert.equal(siteFromHash('#%E0%A4%A'), null);
});

/* ---------- Writing one ---------- */

test('home is the first example in the first mode, so it has no hash at all', () => {
  assert.equal(new URL(shareUrl(HOME, MODES[0])).hash, '');
});

test('each half is left out when it is the default', () => {
  assert.equal(new URL(shareUrl(OTHER, MODES[0])).hash, `#${OTHER}`);
  assert.equal(new URL(shareUrl(HOME, 'create')).hash, '#create');
  assert.equal(new URL(shareUrl(OTHER, 'create')).hash, `#create#${OTHER}`);
});

test('the link drops index.html, so it reads ".../#example"', () => {
  assert.doesNotMatch(shareUrl(OTHER, MODES[0]), /index\.html/);
});

test('what a link says is what reading it back gives', () => {
  for (const m of MODES) for (const id of [HOME, OTHER]){
    const { hash } = new URL(shareUrl(id, m));
    assert.equal(siteFromHash(hash) || HOME, id, `${m} ${id}`);
    assert.equal(modeFromHash(hash) || MODES[0], m, `${m} ${id}`);
  }
});

/* ---------- The modes themselves ---------- */

test('the modes run in the order you would meet them', () => {
  assert.deepEqual(MODES, ['explore', 'create', 'coverage', 'mutation', 'smells']);
  assert.equal(MODES[0], 'explore', 'the default, so the one left out of a link');
});
