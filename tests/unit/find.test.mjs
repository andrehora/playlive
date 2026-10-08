// Finding elements the way a person describes them, and saying so when it
// cannot. Everything here reads a page; nothing here asks whether an element is
// visible, which is a question only a real browser can answer — query() is
// called with includeHidden, and the visible half stays in the Playwright suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, site } from './env.mjs';

const { roleOf, rawName, labelText, query, describeTarget, describeStep, describeStepBase, similarity, hintFor }
  = await load('src/find.js');
const { targetFor, targetParts, renderTarget, yq } = await load('src/recorder.js');
const { validate } = await load('src/parse.js');

/* ---------- Roles ---------- */

test('a role is what the element is, as a person would name it', async () => {
  const d = await site(`
    <button id="b">Go</button>
    <a id="a" href="/x">Home</a>
    <a id="noHref">Not a link</a>
    <textarea id="ta"></textarea>
    <select id="s"></select>
    <h2 id="h">Title</h2>
    <input id="t"><input id="c" type="checkbox"><input id="r" type="radio">
    <input id="sub" type="submit"><input id="hid" type="hidden">
    <div id="d"></div>
    <div id="role" role="tab">Tab</div>
  `);
  const r = id => roleOf(d.getElementById(id));
  assert.equal(r('b'), 'button');
  assert.equal(r('a'), 'link');
  assert.equal(r('noHref'), null, 'an anchor with no href is not a link');
  assert.equal(r('ta'), 'textbox');
  assert.equal(r('s'), 'combobox');
  assert.equal(r('h'), 'heading');
  assert.equal(r('t'), 'textbox');
  assert.equal(r('c'), 'checkbox');
  assert.equal(r('r'), 'radio');
  assert.equal(r('sub'), 'button');
  assert.equal(r('hid'), null, 'a hidden input is nothing a test targets');
  assert.equal(r('d'), null, 'every div has text; offering them all would drown the real targets');
  assert.equal(r('role'), 'tab', 'an explicit role wins');
});

/* ---------- Names ---------- */

test('a name is the aria-label, then the label, then the text', async () => {
  const d = await site(`
    <button id="aria" aria-label="Add Coffee beans to cart">Add</button>
    <label for="f">Email</label><input id="f">
    <button id="text">  Log   in  </button>
    <input id="ph" placeholder="Search">
    <input id="val" value="Submit" type="submit">
  `);
  assert.equal(rawName(d.getElementById('aria')), 'Add Coffee beans to cart');
  assert.equal(labelText(d.getElementById('f')), 'Email');
  assert.equal(rawName(d.getElementById('text')), 'Log in', 'one space between words');
  assert.equal(rawName(d.getElementById('ph')), 'Search');
  assert.equal(rawName(d.getElementById('val')), 'Submit');
});

/* ---------- Finding ---------- */

test('{ role, name } matches on the name exactly, then on part of it', async () => {
  const d = await site('<button>Log in</button><button>Log in with Google</button>');
  assert.equal(query({ role: 'button', name: 'Log in' }, true).length, 1, 'exact wins over partial');
  assert.equal(query({ role: 'button', name: 'Log in' }, true)[0], d.querySelector('button'));
  assert.equal(query({ role: 'button', name: 'with Google' }, true).length, 1, 'and part of it is tried next');
  assert.equal(query({ role: 'button' }, true).length, 2, 'no name means every button');
});

test('a name matches however it is spaced or cased', async () => {
  await site('<button>  Log   In  </button>');
  assert.equal(query({ role: 'button', name: 'log in' }, true).length, 1);
});

test('{ label } finds the field the label is for', async () => {
  const d = await site('<label for="e">Email</label><input id="e"><label for="p">Password</label><input id="p" type="password">');
  assert.equal(query({ label: 'Email' }, true)[0], d.getElementById('e'));
  assert.equal(query({ label: 'Password' }, true)[0], d.getElementById('p'));
  assert.equal(query({ label: 'Nothing' }, true).length, 0);
});

test('{ label } also reads an aria-label, and only ever finds a field', async () => {
  const d = await site('<input id="a" aria-label="Email"><button aria-label="Email">Not a field</button>');
  const found = query({ label: 'Email' }, true);
  assert.deepEqual(found, [d.getElementById('a')]);
});

test('{ placeholder } matches the placeholder exactly', async () => {
  const d = await site('<input id="s" placeholder="Search products">');
  assert.equal(query({ placeholder: 'Search products' }, true)[0], d.getElementById('s'));
  assert.equal(query({ placeholder: 'Search' }, true).length, 0, 'a placeholder is matched whole');
});

test('{ text } matches part of the text, on the innermost element holding it', async () => {
  const d = await site('<div><p><span>Welcome back, Ana</span></p></div>');
  const found = query({ text: 'Welcome back' }, true);
  assert.deepEqual(found, [d.querySelector('span')], 'the span, not the p and the div around it');
});

test('a page with nothing on it finds nothing rather than throwing', async () => {
  await site('');
  assert.deepEqual(query({ text: 'anything' }, true), []);
  assert.deepEqual(query({}, true), []);
});

/* ---------- Saying what a step does ---------- */

test('a target is described the way the file writes it', () => {
  assert.equal(describeTarget({ role: 'button', name: 'Go' }), 'button “Go”');
  assert.equal(describeTarget({ role: 'button' }), 'button');
  assert.equal(describeTarget({ label: 'Email' }), 'field “Email”');
  assert.equal(describeTarget({ placeholder: 'Search' }), 'field with placeholder “Search”');
  assert.equal(describeTarget({ text: 'Send' }), 'text “Send”');
  assert.equal(describeTarget(null), 'element');
  assert.equal(describeTarget({}), 'element');
});

test('every action says what it does, in words', () => {
  const said = yaml => validate(`test: T\nsteps:\n${yaml}`).spec.tests[0].steps.map(describeStepBase);
  assert.deepEqual(said([
    '  - click: { role: button, name: Go }',
    '  - fill: { label: Email, value: a@b.test }',
    '  - select: { label: Country, value: Spain }',
    '  - check: { label: Terms }',
    '  - uncheck: { label: Terms }',
    '  - wait: 300',
    '  - expectText: Hi',
    '  - expectNoText: Oops',
    '  - expectVisible: { role: heading, name: Dashboard }',
    '  - expectNumber: { text: Ends in, min: 1, max: 24 }'
  ].join('\n')), [
    'Click button “Go”',
    'Type “a@b.test” into field “Email”',
    'Choose “Spain” in field “Country”',
    'Check field “Terms”',
    'Uncheck field “Terms”',
    'Wait 300 ms',
    'Expect to see “Hi”',
    'Expect not to see “Oops”',
    'Expect heading “Dashboard” to be visible',
    'Expect a number between 1 and 24 beside “Ends in”'
  ]);
});

test('a step with its own timeout says how long it waits', () => {
  const [s] = validate('test: T\nsteps:\n  - click: { text: Go, timeout: 8000 }\n').spec.tests[0].steps;
  assert.equal(describeStep(s), 'Click text “Go” (waits up to 8s)');
  assert.equal(describeStepBase(s), 'Click text “Go”', 'the base says the action, the wait is added on top');
});

test('an action nobody knows is named rather than hidden', () => {
  assert.equal(describeStepBase({ action: 'teleport' }), 'teleport');
});

/* ---------- "Did you mean…?" ---------- */

test('similarity is 1 for the same text and 0 for nothing', () => {
  assert.equal(similarity('Log in', 'log  in'), 1, 'a person reads these as the same');
  assert.equal(similarity('', 'Log in'), 0);
  assert.equal(similarity('Log in', ''), 0);
});

test('a string inside another scores well, and shared words count too', () => {
  assert.ok(similarity('Log in', 'Log in with Google') > 0.2);
  assert.ok(similarity('Questions about my order', 'Questions about your order?') > 0.5);
  assert.ok(similarity('Log in', 'Delete account') < 0.45, 'and two unrelated labels do not');
});

test('a near miss gets a "did you mean" naming a real target', async () => {
  await site('<button>Log in</button>');
  const hint = hintFor({ role: 'button', name: 'Login' });
  assert.match(hint, /Did you mean \{ role: button, name: Log in \}\?/);
});

test('nothing close enough gets no guess at all', async () => {
  await site('<button>Log in</button>');
  assert.equal(hintFor({ role: 'button', name: 'Delete my entire account forever' }), '');
});

/* ---------- The target a recorder would write ---------- */

test('a target is written in the vocabulary the runner understands', async () => {
  const d = await site(`
    <button id="b">Send</button>
    <label for="e">Email</label><input id="e">
    <input id="ph" placeholder="Search">
    <input id="aria" aria-label="Postcode">
    <h1 id="h">Checkout</h1>
    <div id="plain">Just words</div>
  `);
  const t = id => targetFor(d.getElementById(id));
  assert.equal(t('b'), '{ role: button, name: Send }');
  assert.equal(t('e'), '{ label: Email }', 'a labelled field is named by its label');
  assert.equal(t('ph'), '{ placeholder: Search }', 'and by its placeholder when it has no label');
  assert.equal(t('aria'), '{ label: Postcode }');
  assert.equal(t('h'), '{ role: heading, name: Checkout }');
  assert.equal(t('plain'), '{ text: Just words }', 'something with no role is named by its text');
});

test('every target a page offers parses as a step', async () => {
  const d = await site('<button>Send</button><label for="e">E-mail: a, b</label><input id="e"><h1>Hi</h1>');
  for (const el of d.body.querySelectorAll('*')){
    const target = targetFor(el);
    if (!target) continue;
    const v = validate(`test: T\nsteps:\n  - expectVisible: ${target}\n`);
    assert.equal(v.error, undefined, `${target}: ${v.error}`);
  }
});

test('a role stays plain and the rest is quoted when it has to be', () => {
  assert.equal(renderTarget({ role: 'button', name: 'Send' }), '{ role: button, name: Send }');
  assert.equal(renderTarget({ label: 'E-mail: a, b' }), '{ label: "E-mail: a, b" }');
  assert.equal(renderTarget({ text: 'yes' }), '{ text: "yes" }', 'YAML would read a bare yes as true');
});

test('a value is quoted only where plain would be read wrong', () => {
  assert.equal(yq('Send'), 'Send');
  assert.equal(yq('a, b'), '"a, b"');
  assert.equal(yq('Count: 3'), '"Count: 3"');
  assert.equal(yq('yes'), '"yes"');
  assert.equal(yq('true'), '"true"');
  assert.equal(yq('#4821'), '"#4821"', 'YAML would read a # as a comment');
  assert.equal(yq('trailing '), '"trailing "');
  assert.equal(yq(''), '""');
});

test('targetParts says nothing about an element there is nothing to say about', async () => {
  const d = await site('<div id="empty"></div>');
  assert.equal(targetParts(d.getElementById('empty')), null);
});
