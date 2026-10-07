# AGENTS.md

**Playlive** is a browser-based end-to-end test runner for students. You write tests in a small YAML format, pick an example site, press **Run**, and watch each step happen in an iframe. Tests export to Playwright and Cypress.

It is client-side and buildless: files are served as they are, with no bundler or install step. It uses ES modules, so serve it over http (`npm run serve`) rather than opening it from disk.

**Decided:** marks a settled choice. Don't reopen one unless asked.

## Layout

```
index.html                Markup only, plus <script type="module" src="src/main.js">
src/app.css               All app styles
src/*.js                  The app, as ES modules
examples/<id>/index.html  One example site per folder (a real page the iframe loads)
examples/<id>/tests.yaml  That site's tests
examples/<id>/bugs.js     Optional mutations for Mutation mode
examples/examples.js      Manifest: name, category, host, accent, storageKeys, bugs
examples/site.css         Shared stylesheet for example pages
examples/hooks.js         Loaded first by every example: $(id), error and storage hooks
tests/unit/               node --test + jsdom
tests/e2e/                Playwright, driving the real app
tests/server.mjs          Static server for both suites
```

Modules, roughly in dependency order: `dom` · `state` · `util` · `icons` · `sites` · `find` · `actions` · `parse` · `history` · `snapshots` · `htmlview` · `results` · `run` · `recorder` · `catalog` · `coverage` · `bugs` · `create` · `smells` · `complete` · `exports` · `dialog` · `picker` · `share` · `editor` · `ui` · `layout` · `modes` · `main`.

### Module rules (no bundler)

- **Only `main.js` boots anything.** Other modules may register listeners but never call across modules at load time. Import cycles are fine because of this.
- **Shared mutable state lives in `state.js`**, each with a setter: `setRunning(true)`, not `running = true`.
- **A module nothing imports never runs.** That is why `main.js` has `import './dialog.js';`.
- Modules talk through events rather than reaching into each other's panels (e.g. `run.js` emits `playlive:busy`, `bugs.js` listens).
- `window.playlive` is the test API. Add to it rather than reaching into modules from a test.

### Dependencies

Runtime: **js-yaml 4.1.0** from cdnjs (global `jsyaml`) and IBM Plex from Google Fonts. Nothing else: no new CDNs, frameworks or build step unless asked. Dev: jsdom, and js-yaml **pinned to 4.1.0** so unit tests parse like the app.

Keep every path relative (the app runs from a GitHub Pages subfolder) and every image inline (the CSP allows no remote images).

## Checking your work

```sh
npm install && npx playwright install chromium   # once
npm run test:unit        # ~2s, no browser
npm run test:e2e         # ~1.5 min, must be green
npm test                 # both
npm run lint && npm run lint:css                 # both must be clean
```

- **Unit vs e2e:** a function of a string or page (parsing, exports, smells, autocomplete) goes in `tests/unit/`. Anything needing a real browser (visibility, layout, a run going green, keyboard focus) goes in `tests/e2e/`. Never test the same rule in both.
- **Unit gotchas** (`tests/unit/env.mjs`):
  - Import modules with `await load(...)` after the document exists, never statically.
  - jsdom has no layout, so `visible()` is always false. Don't test visibility in unit tests.
  - `requestAnimationFrame` is queued; call `flushFrames()` to run it.
- The e2e suite derives its site list from the manifest and skips the **Flaky** category by reading it, never via a hand-kept id list.
- If you touched layout, take a screenshot and look at it. The desktop page must never scroll; panels scroll inside themselves.
- Add a test with any new action, exporter rule or site.

## The YAML format

```yaml
vars:                       # ${name}; ${unique} changes every run
  email: ana@example.test
beforeEach:
  - fill: { label: Email, value: "${email}" }

test: Shows the dashboard   # each test starts with "test:" at column 0
steps:
  - fill: { label: Password, value: hunter2 }
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000
```

- Only `vars`, `beforeEach` and `failOnPageErrors` may come before the first test. A file never names its site.
- Each test starts fresh at `/` and is independent. There is no navigation step.
- Targets: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a bare string (= `{ text }`).
- **Values and `timeout:` go inside the target braces:** `- select: { label: Country, value: United Kingdom }`. Quote values containing `,` `:` `{` `}` `#` or `${var}`. Steps with no target (`expectText`, `expectNoText`, `wait`) take `timeout:` on their own line.
- Default timeout is 4s (`TIMEOUT`).
- Old shapes (`tests:` list, `site:`, `flows:`/`use:`) are gone and fail with the normal errors.

**Actions:** `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectTextInRange`, `expectVisible`.

**`expectTextInRange`** (`{ text, min, max, timeout }`) reads the first number on the first visible line containing `text` (commas removed) and passes if it's within `[min, max]`. It's the fix for values that drift (countdowns, growing counts). It has no target, so both exporters read page text. Keep the runner and both exporters in sync.

**Adding an action** means updating all of: `ACTIONS`, `normalizeStep`, `describeStepBase`, `toPlaywright`, `toCypress`, `ASSERTIONS` in `parse.js` (if it's a check), `KINDS` in `complete.js` (if it takes a target), and one non-Flaky example that uses it.

The format and its errors are pinned in `tests/unit/parse.test.mjs`.

## Adding an example site

1. `examples/<kebab-id>/index.html`:

   ```html
   <!doctype html>
   <html lang="en">
   <head>
   <meta charset="utf-8">
   <title>Coupon code</title>
   <script src="../hooks.js"></script>
   <link rel="stylesheet" href="../site.css">
   <style>:root{--accent:#b45309}</style>
   </head>
   <body>…</body>
   </html>
   ```

2. `examples/<id>/tests.yaml` with 2–5 tests covering the main path and its errors.
3. A manifest line: `"coupon-code": { name: "Coupon code", category: "Shopping", host: "localhost:3022", accent: "#b45309" },`

Rules:

- **Order:** categories run in manifest order; within a category, sites are sorted by name. Ports run 3001–3100 down the list, so inserting a site shifts the ones after it. The first site of the first category is the home page.
- **Categories and accents** (manifest order; the page's `--accent` must match):

  | Shopping `#b45309` | Support `#0f766e` | Accounts `#1d4ed8` | Admin `#475569` |
  |---|---|---|---|
  | **Travel** `#0e7490` | **Banking** `#a16207` | **Search** `#0369a1` | **Social** `#be185d` |
  | **Inbox** `#4338ca` | **Productivity** `#7c3aed` | **Media** `#a21caf` | **Health** `#4d7c0f` |
  | **Dashboards** `#5b21b6` | **Learning** `#78350f` | **Games** `#9f1239` | **Flaky** `#b91c1c` |

- **Decided:** a category is one word naming a kind of app, never a mechanism. No Misc, no Forms. Sixteen is the limit for this colour scheme.
- **Decided:** **Flaky** is the exception and stays last. Its one site (Weather app) is random on purpose, and its tests should *mostly* pass. It deliberately doesn't use `expectTextInRange`; that fix is shown in `bmi-calculator`. Add a site here only if unreliability is the lesson.
- A new category needs an icon in `icons.js` (inline SVG, 24×24, stroke-only, `currentColor`).
- Write plain HTML/JS. Make elements testable the way a person describes them: real `<label for>`, real buttons, `aria-label` when buttons share text.
- **Deterministic only.** Outside Flaky, nothing random, slow or clock-dependent.
- If the page writes storage before Playlive can see it, list the keys as `storageKeys` so **Reset** clears them.
- `expectNoText` also sees `<option>` labels, so pick a string no `<select>` on the page holds.
- Pinned in `tests/unit/examples.test.mjs` (ports, order, accents, icons, test count). Test smells across all examples are pinned in `tests/unit/smells.test.mjs`, so an accidental smell fails the suite.

## UI conventions

- **Colours have meanings.** Grey `--active` = running, green `--pass`, red `--fail`, yellow `--running` = the current line. Blue `--run` is only for interactive controls; never use it for progress.
- **Scores band in three:** green at 100%, `--warn` from 60%, red below. Don't rely on colour alone (coverage dots also differ in shape).
- **Theming:** define every colour three times: light, `prefers-color-scheme: dark`, `[data-theme="dark"]`.
- **Mobile-first sizing:** use the tokens in `:root` (`--tap`, `--btn-font`, `--ctl-font`, …), redefined smaller at `min-width:901px`. No literal sizes. `--ctl-font` stays 16px on phones to stop iOS zoom.
- **Copy:** sentence case. Error messages say how to fix the problem.
- **Accessibility:** visible focus rings, labelled buttons, `aria-pressed`/`aria-expanded`, keyboard support, `prefers-reduced-motion`.
- **Never call `scrollIntoView` inside the iframe** (it scrolls the outer page). Use `scrollWithinFrame` and `followInResults`.
- **Runs are always followed** (editor line, Results row and HTML view line). There is no toggle.
- **The desktop page never scrolls.** Panel heights (`--editor-h`, `--cov-h`, `--bug-h`, `--smell-h`, `--create-h`) are clamped in `layout.js`. Clamps measure what's on screen, not which mode is active. A folded panel never grows; space goes to the mode's panel, then Results, then the editor.
- On narrow screens (<901px), panels stack and the test code starts folded.

## Modes

`modes.js` owns modes; the value lives in `state.js` and on `<html data-mode>`, which the CSS uses to show or hide panels. **Explore** (examples and tests), **Create** (write the tests from their titles), then the three graders: **Coverage**, **Mutation**, **Smells**.

- **Decided:** one mode, one question, one panel.
- Adding a mode means a `MODES` entry, a button and the CSS for its panels.
- The URL hash holds mode and example (`#create#coupon-code`), each omitted when default. `share.js` owns it: `selectSite` *replaces* the hash, and `hashchange` reads both halves before applying either. **Decided:** a hash, not a query (works on GitHub Pages).
- **Reset** (`resetAll` in `main.js`) is global: it clears every Playlive key for every example. Layout, theme and mode survive.

## Features

- **Catalog** (`catalog.js`): what the live page offers, read through `targetParts` the same way the recorder does. Harvests only add. Hidden elements are kept.
- **Coverage** (`coverage.js`): controls the run actually used, credited at run time under the catalog's `keyFor` key, never by reading the file. Hidden controls count against you. Untested rows offer **Add test**, which appends a whole `test:` block.
- **Mutation** (`bugs.js`, called "bugs" in code, "Mutation" on screen; don't rename): `{ id, title, find, replace }` patches applied to the page source and served as `srcdoc`. It refuses to start unless the suite is green. Each `find` must match **exactly once**. A site with bugs needs `bugs: true` in the manifest. `hunting` keeps hunt results out of history, status and coverage.
- **Create** (`create.js`): the editor starts with only the example's test titles as comments. It keeps its own file per site (`createTests`, stored under `:create`); always go through `testsFor`/`stashEditor`. A title is done when a test with that exact title makes every check the original makes in its own steps. Tests with no checks aren't offered. **Decided:** the titles are the whole brief.
- **Smells** (`smells.js`): reads the file, not a run. Unknown Test (no own check), Eager Test (≥ `EAGER` = 4 assertion phases), Assertion Roulette (> `ROULETTE` = 5 checks), Magic Value (same `fill`/`select` value on more than one line), Duplication of Setup (every test opens with the same steps). **Decided:** a smell stays silent when unsure, and one with no line to jump to isn't shown. Seven example tests are deliberately smelly and commented so. Adding a smell means an entry in `SMELLS`, a rule in `report`, tests for what it catches and what it must not, and an example that has it.
- **HTML view** (`htmlview.js`): live markup, re-read after every step, with the step's line marked and the action name in the gutter. Editable; **Save** makes it the site's page (`editedHtml`, never stored).
- **The test editor refuses copy, cut, paste and drop** (`REFUSED` in `editor.js`). **Decided:** writing the steps is the exercise. Export is the way out.
- **Autocomplete** (`complete.js`): `context()` reads the caret, `itemsFor()` fills from the catalog. It only offers what the action can act on.
- **Exports:** no comments. Preserve runner semantics: fresh page per test, partial match for `expectText`, visible text only for `expectNoText`, per-step timeouts, `${unique}`. Update both exporters together.

## Storage

Keys (no version suffix): `live-test-runner`, `:create`, `:history`, `:status`, `:site-keys`, `:layout`. Wrap every access in `try/catch` and read defensively. **Never stored:** the catalog, scores, anything about bugs, edited markup, the smells tab.

## Known limits

Same-origin pages only. Clicks and typing are synthetic DOM events (`isTrusted` is false). Uploads, downloads, tabs and native dialogs are out of scope. Exports are syntax-checked, not executed.
