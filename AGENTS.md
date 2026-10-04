# AGENTS.md

For AI coding agents working on **Playlive**: a browser-based end-to-end test runner. You write tests in a small YAML format, pick an example site, press **Run all**, and watch the steps happen in an iframe. Tests export to Playwright and Cypress.

Everything is client-side and buildless: the files are served exactly as they are. There is no bundler and no install step, but the app must be **served over http** rather than opened from disk, because it uses ES modules.

## Layout

```
index.html                The page: markup only, plus <script type="module" src="src/main.js">
src/app.css               All of the app's styles
src/*.js                  The app, as ES modules (see below)
examples/<id>/index.html  One example site per folder, a real page the iframe loads
examples/<id>/tests.yaml  That site's example tests
examples/examples.js      The manifest: name, category, host, accent, storage keys
examples/site.css         The stylesheet every example page shares
examples/hooks.js         Loaded first by every example page: $(id), error and storage hooks
tests/                    Playlive's own Playwright suite (dev only)
```

The modules, roughly in dependency order: `dom` (elements) · `state` · `util` · `sites` (loading a site, saved tests) · `find` (locating elements, "did you mean…?") · `actions` (what a step does) · `parse` · `history` · `snapshots` · `htmlview` · `results` · `run` · `recorder` · `catalog` · `complete` · `exports` · `dialog` · `picker` · `editor` · `ui` · `layout` · `main` (wiring and boot).

Three rules keep the modules working without a bundler:

- **Only `main.js` boots anything.** Other modules may register their own listeners, but nothing calls across modules at load time. Import cycles are fine as long as that holds.
- **Shared mutable state lives in `state.js`** (`running`, `stopRequested`, `currentSite`, `editorSite`, …). Reading an imported binding gives the current value, but only the declaring module can assign, so each one has a setter: `setRunning(true)`, not `running = true`.
- **A module nothing imports from never runs.** `main.js` carries `import './dialog.js';` for exactly that reason.

Runtime dependencies are **js-yaml 4.1.0** from cdnjs (global `jsyaml`) and IBM Plex from Google Fonts. Do not add CDNs, frameworks or a build step without being asked. Keep every path relative, so the app works from a subfolder on GitHub Pages, and keep images inline: the published page runs under a CSP that allows **no remote images**, which is why the framework logos are inlined SVG.

## Checking your work

```sh
npm install && npx playwright install chromium   # once
npm test                                         # ~1 minute, must be green
npm run serve                                    # http://localhost:4173
```

The suite starts its own server but needs network access for js-yaml. It derives the site list from `examples/examples.js`, so a new example site gets a test automatically. **Flaky app** is excluded from the run tests, because it fails on purpose.

It already covers: every example site's tests passing with no page errors, light/dark/390px, and every export being valid comment-free JavaScript. If you touched layout, also screenshot and look — the desktop page must never scroll, panels scroll inside themselves. Add a test alongside any new action, exporter rule or site.

## The YAML format

```yaml
site: login                 # which example site the file belongs to
vars:                       # used as ${name}; ${unique} is new on every run
  email: ana@example.test
flows:                      # reusable step lists: "- use: login"
  login:
    - fill: { label: Email, value: "${email}" }
beforeEach:                 # runs at the start of every test
  - use: login

test: Shows the dashboard   # every test starts with "test:" at column 0
steps:
  - fill: { label: Password, value: hunter2 }
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000           # optional per-step wait, in ms
```

- Tests are top-level `test:` blocks, titled with `test:` and never `name:`. A legacy `tests:` list still parses but is not written in new content.
- Each test starts from a fresh page at `/` and must not depend on other tests.
- Only `site`, `vars`, `flows`, `beforeEach` and `failOnPageErrors` may appear before the first test.
- Targets describe what a user sees: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a bare string meaning `{ text }`.
- **The value goes inside the target**, so a step is one line: `- select: { label: Country, value: United Kingdom }`. A `value:` on its own line is an error that says so. Inside the braces, quote any value holding `,` `:` `{` `}` or a `${var}`: `value: "${email}"`.
- `timeout:` goes inside the target too, or on its own line for the steps that have no target (`expectText`, `expectNoText`, `wait`, `goto`).

Actions: `goto`, `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectVisible`, and `use` for flows. Steps wait up to 4s (`TIMEOUT`) unless they set `timeout:`.

Adding an action means updating **all** of: `ACTIONS`, `normalizeStep`, `describeStepBase`, `toPlaywright`, `toCypress`, `KINDS` in `complete.js` if it takes a target, and one example site that uses it.

## Adding an example site

Three things: a folder with a page and its tests, and a line in the manifest.

```html
<!-- examples/coupon-code/index.html -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Coupon code</title>
<script src="../hooks.js"></script>
<link rel="stylesheet" href="../site.css">
<style>:root{--accent:#b45309}</style>
</head>
<body>
  …
  <script>…</script>
</body>
</html>
```

```js
// examples/examples.js
"coupon-code": { name: "Coupon code", category: "Shopping", host: "localhost:3019", accent: "#b45309" },
```

- **Order matters.** Sites group by category in manifest order, and ports run 3001–3050 in that order.
- **Accent per category,** in both the manifest and the page's `--accent`: Forms `#0f766e`, Accounts `#1d4ed8`, Shopping `#b45309`, Productivity `#7c3aed`, Navigation & content `#be185d`, Calculators & data `#0e7490`, States & feedback `#4d7c0f`.
- **Write ordinary HTML and JavaScript.** `hooks.js` gives every page `$(id)` for `document.getElementById`. The page is a real file, so there is nothing to escape.
- A site that writes storage keys before Playlive can see them lists them as `storageKeys` in the manifest, so **Reset** still clears them.
- **Make it testable the way a person would describe it:** real `<label for>`, real buttons, and an `aria-label` when buttons share text ("Add Coffee beans to cart").
- **Keep it deterministic.** Only **Flaky app** may be random or slow.
- Give it a kebab-case id, used as its folder name, name it after what it demonstrates, and write 2–4 tests covering the main path and its errors.

## Conventions

- **Colors mean things.** Yellow `--running`, green `--pass`, red `--fail`. Blue `--run` is for interactive controls only — never show progress in blue.
- **Theming.** Define every color three times: light, `prefers-color-scheme: dark`, and `[data-theme="dark"]`.
- **Sizing is mobile first.** `:root` holds the touch-sized control tokens (`--tap`, `--btn-font`, `--btn-pad`, `--ctl-font`, `--icon-tap`, `--chev`, `--code-font`, `--code-line`, …) and `@media (min-width:901px)` redefines them smaller for a mouse. Size controls with the tokens rather than with literals, so both ends follow; `--ctl-font` stays at 16px on phones because anything smaller makes iOS zoom on focus. A test measures every visible control at 360, 390 and 768px.
- **Scrolling.** Never call `scrollIntoView` inside the iframe; it scrolls the outer page. Use `scrollWithinFrame` and `followInResults`.
- **Results** are folded by default, and folds the user opens stay open across runs (`expandedTests`).
- **The site panel has two views,** Site and HTML, remembered in the layout. The HTML view (`htmlview.js`) reads the markup back out of the live page after every load and every step, so typed values and revealed screens are really there, and marks the line of the element the step acted on green or red, following it the way Results follows a step. The page stays laid out underneath, covered rather than hidden: a step can only find an element the browser is still giving a size to.
- **Toolbar order** is Run all, Stop, Record; in Step by step mode Run all becomes Next step, with no separate button.
- **Copy** is sentence case, with error messages that say how to fix the problem.
- **Accessibility.** Visible focus rings, real labelled buttons, `aria-pressed`/`aria-expanded`, keyboard support in the picker and dialog, `prefers-reduced-motion`.
- **Storage.** Wrap every access in `try/catch`, and bump a key's version suffix if its shape changes: `live-test-runner:v4` (tests per site), `:history:v1`, `:status:v1`, `:site-keys:v1`, `:layout:v1`.
- **The site catalog.** `catalog.js` reads the live iframe into a per-site list of what a step could target: clickables, fields, selects and their options, toggles, and the page's text. It reads the page exactly as the recorder does, through `targetParts`, so anything it offers is something `find.js` can locate. Hidden elements are kept (an error message already in the DOM is a fair `expectText` target) and harvests only ever add, so a screen a run passed through stays known. It is harvested on every frame load and after every step, cleared by **Reset**, and never stored.
- **Autocomplete.** `complete.js` is two halves: `context()` reads the caret and says what may go there, `itemsFor()` fills that slot from the site catalog. An action only ever offers what it could act on, so `select:` lists that page's `<select>`s with their own options and `check:` only its boxes. It opens on the characters that start something new and on Ctrl+Space, closes when there is nothing left to choose, and owns Tab and Enter while it is open — which is what `completionOpen` in `state.js` tells the editor. The list is on `<body>` in viewport coordinates, because a panel clips what overflows it; on a phone it spans the editor instead of following the caret.
- **The test API.** `main.js` puts `window.playlive` on the page for Playlive's own tests. Add to it rather than reaching into modules from a test.
- **Exports** carry no comments and must keep the runner's meaning: fresh page per test, partial matching for `expectText`, visible text only for `expectNoText`, per-step timeouts, `${unique}`. Update both exporters when matching rules change.

## Known limits

- Same-origin pages only. Other local sites need a reverse proxy, or a script that talks to Playlive over `postMessage`.
- Clicks and typing are DOM events (`isTrusted` is false). Uploads, downloads, extra tabs and native dialogs are out of scope.
- Exports are syntax-checked, not executed; run each framework once for real before relying on it.
