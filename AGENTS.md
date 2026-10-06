# AGENTS.md

For AI coding agents working on **Playlive**: a browser-based end-to-end test runner. You write tests in a small YAML format, pick an example site, press **Run**, and watch the steps happen in an iframe. Tests export to Playwright and Cypress.

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

The modules, roughly in dependency order: `dom` (elements) · `state` · `util` · `icons` (one SVG per category) · `sites` (loading a site, saved tests) · `find` (locating elements, "did you mean…?") · `actions` (what a step does) · `parse` · `history` · `snapshots` · `htmlview` · `results` · `run` · `recorder` · `catalog` · `coverage` · `complete` · `exports` · `dialog` · `picker` · `share` · `editor` · `ui` · `layout` · `main` (wiring and boot).

Three rules keep the modules working without a bundler:

- **Only `main.js` boots anything.** Other modules may register their own listeners, but nothing calls across modules at load time. Import cycles are fine as long as that holds.
- **Shared mutable state lives in `state.js`** (`running`, `stopRequested`, `currentSite`, `editorSite`, …). Reading an imported binding gives the current value, but only the declaring module can assign, so each one has a setter: `setRunning(true)`, not `running = true`.
- **A module nothing imports from never runs.** `main.js` carries `import './dialog.js';` for exactly that reason.

Runtime dependencies are **js-yaml 4.1.0** from cdnjs (global `jsyaml`) and IBM Plex from Google Fonts. Do not add CDNs, frameworks or a build step without being asked. Keep every path relative, so the app works from a subfolder on GitHub Pages, and keep images inline: the published page runs under a CSP that allows **no remote images**, which is why the framework logos are inlined SVG.

## Checking your work

```sh
npm install && npx playwright install chromium   # once
npm test                                         # ~1 minute, must be green
npm run lint && npm run lint:css                 # eslint and stylelint, both must be clean
npm run serve                                    # http://localhost:4173
```

Linting is dev-only, like the test suite: nothing is compiled and the files are still served exactly as they are. `eslint.config.js` lints `src/`, `examples/` and `tests/`; `.stylelintrc.json` lints the two stylesheets, with the stylistic rules that argue with this sheet's style turned off (one rule per line, `rgba()`, `(min-width:901px)`, ids named after their elements) and the ones that catch mistakes left on. Inline `<style>` and `<script>` in the HTML are not linted. Both have a `--fix` twin: `npm run lint:fix`, `npm run lint:css:fix`.

The suite starts its own server but needs network access for js-yaml. It derives the site list from `examples/examples.js`, so a new example site gets a test automatically. **Flaky app** is excluded from the run tests, because it fails on purpose.

It already covers: every example site's tests passing with no page errors, light/dark/390px, and every export being valid comment-free JavaScript. If you touched layout, also screenshot and look — the desktop page must never scroll, panels scroll inside themselves. Add a test alongside any new action, exporter rule or site.

## The YAML format

```yaml
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
- Only `vars`, `flows`, `beforeEach` and `failOnPageErrors` may appear before the first test. A file belongs to whichever site is selected, so it never names one; a legacy `site:` line still parses and is ignored.
- Targets describe what a user sees: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a bare string meaning `{ text }`.
- **The value goes inside the target**, so a step is one line: `- select: { label: Country, value: United Kingdom }`. A `value:` on its own line is an error that says so. Inside the braces, quote any value holding `,` `:` `{` `}` or a `${var}`: `value: "${email}"`.
- `timeout:` goes inside the target too, or on its own line for the steps that have no target (`expectText`, `expectNoText`, `wait`).

Actions: `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectVisible`, and `use` for flows. There is no navigation step: a test starts on the site's page and stays there, and the exports open `/` for every test. Steps wait up to 4s (`TIMEOUT`) unless they set `timeout:`.

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
"coupon-code": { name: "Coupon code", category: "Shopping", host: "localhost:3022", accent: "#b45309" },
```

- **Order matters.** Categories run in manifest order and ports run 3001–3100 down that list, but **within a category the sites are sorted by name**, so adding one inserts it alphabetically rather than at the end. **Shopping** leads, and the first site of the first category is home, so `/` and `#address-form` are the same page. Sorting by name is why **Flaky app** no longer sits last: it is last in nothing but its own name.
- **One theme per category, one word.** A category names a kind of app someone would recognise, never a mechanism, and a name that wants two words keeps the first. The sixteen, in manifest order: Shopping, Support, Accounts, Admin, Travel, Banking, Search, Social, Inbox, Productivity, Media, Health, Dashboards, Learning, Games, Misc. There is no **Forms** category: a form is a widget, not a kind of app, and every theme has forms in it. **Misc** is the one exception and the one catch-all: it holds what no theme fits — a bare counter, and the sites about waiting and failing — and stays last, so a new site goes in a theme if one fits and only then here.
- **An icon per category,** living in `icons.js` as inline SVG (24x24, stroke-only, so `svg.i` sizes it and `currentColor` tints it). It is drawn in three places, each tinted with the category's accent: the picker's category heads, which sit on a band of that accent so a scroll through a hundred examples reads as sixteen groups, the example button in the app bar, and the Site panel's badge — so the colour groups and the icon names. The band and the badge share one mix, the accent at 16% behind text of the accent at 62% towards the ink, which is what keeps every one of the sixteen legible in both themes. A category with no icon of its own falls back to **Misc**'s, which means a theme added to the manifest alone still looks finished; give it its own icon in the same change.
- **Accent per category,** in both the manifest and the page's `--accent`: Support `#0f766e`, Accounts `#1d4ed8`, Admin `#475569`, Shopping `#b45309`, Travel `#0e7490`, Banking `#a16207`, Search `#0369a1`, Social `#be185d`, Inbox `#4338ca`, Productivity `#7c3aed`, Media `#a21caf`, Health `#4d7c0f`, Dashboards `#5b21b6`, Learning `#78350f`, Games `#9f1239`, Misc `#52525b`. Sixteen themes is as many hues as this scheme carries, so the order keeps lookalike pairs apart and a seventeenth theme needs the picker to group themes under coloured sections instead. The picker reads a category's dot from its *first* site's accent, so a page that disagrees with the manifest makes the dot lie rather than failing.
- **Write ordinary HTML and JavaScript.** `hooks.js` gives every page `$(id)` for `document.getElementById`. The page is a real file, so there is nothing to escape.
- A site that writes storage keys before Playlive can see them lists them as `storageKeys` in the manifest, so **Reset** still clears them.
- **Make it testable the way a person would describe it:** real `<label for>`, real buttons, and an `aria-label` when buttons share text ("Add Coffee beans to cart").
- **Keep it deterministic.** Only **Flaky app** may be random or slow. A game picks a fixed card or move order rather than shuffling.
- Give it a kebab-case id, used as its folder name, name it after what it demonstrates, and write 2–5 tests covering the main path and its errors.
- **`expectNoText` sees every bit of visible text, `<option>` labels included,** so asserting that a row is gone needs a string the row's `<select>` cannot also hold: `"Invoice #4821 · no label"`, not `"Invoice #4821"`. A `#` in a target must be quoted too, or YAML reads it as a comment.

## Conventions

- **Colors mean things.** Yellow `--running`, green `--pass`, red `--fail`. Blue `--run` is for interactive controls only — never show progress in blue. The coverage score uses the same three as bands: green at 100%, `--warn` from 60%, red below it, and its groups are green used, `--warn` checked only, red untested — with the dots differing in shape as well, solid, ringed and hollow, so the list never leans on colour alone.
- **Theming.** Define every color three times: light, `prefers-color-scheme: dark`, and `[data-theme="dark"]`.
- **Sizing is mobile first.** `:root` holds the touch-sized control tokens (`--tap`, `--btn-font`, `--btn-pad`, `--ctl-font`, `--icon-tap`, `--chev`, `--code-font`, `--code-line`, …) and `@media (min-width:901px)` redefines them smaller for a mouse. Size controls with the tokens rather than with literals, so both ends follow; `--ctl-font` stays at 16px on phones because anything smaller makes iOS zoom on focus. A test measures every visible control at 360, 390 and 768px.
- **Scrolling.** Never call `scrollIntoView` inside the iframe; it scrolls the outer page. Use `scrollWithinFrame` and `followInResults`.
- **Following is not optional.** The editor marks the line of the running step, Results keeps that step in view, and the HTML view keeps its line in view. There are no toggles for it: a run is meant to be watched.
- **Results** are folded by default, and folds the user opens stay open across runs (`expandedTests`).
- **Three panels share the left column:** Tests, Results, then Coverage, each with a handle between them. Coverage's height is `--cov-h` in the layout, the editor's is `--editor-h`, and the clamps in `layout.js` are what keep the desktop page from ever scrolling: neither handle may squeeze the panel below it past its floor, so the editor starts a little shorter than it did with two panels. On a narrow screen they stack in that order, the site between the first two.
- **On a narrow screen the test code starts folded.** The panels stack there, so a screenful of YAML would push the site and its results off the bottom; `main.js` folds the editor at boot under 901px and the Tests panel's own button brings it back. The file is untouched either way, so running, recording and exporting do not care.
- **Choosing the example lives in the app bar** (`picker.js`): the name with its category icon and pass/fail dot, its list, the stepper that walks the 100 examples, and **Reset**, so the one thing every panel below depends on reads first. There is no separate reload: Reset is the one way back to the start, and it is global rather than per site: it reloads the page showing and clears everything the app kept for *every* example — saved tests, the sites' own stored data, run history, statuses, catalogs, edited markup and the last result — leaving none of our keys in storage (layout and theme, which are about this browser rather than the examples, stay). `resetAll` in `main.js` owns it. The site panel's own head keeps what is about the page on screen — Site/HTML and screen size. On a phone the bar is exactly two rows, each using the whole width: the mark and name with **Reset**, **Share** and the repository spread across the rest of the first — they keep their names and tighten to fit, which is what the second row is for — then the example's list and its stepper sharing the second 60/40, so a name as long as “Address form” still reads while “1 of 100” keeps its arrows. The site panel's head is two centred rows the same way, the page with its category and then the controls.
- **The site panel has two views,** Site and HTML, remembered in the layout. The HTML view (`htmlview.js`) reads the markup back out of the live page after every load and every step, so typed values and revealed screens are really there, and marks the line of the element the step acted on green or red, tagged with the action's own name, following it the way Results follows a step. The page stays laid out underneath, covered rather than hidden: a step can only find an element the browser is still giving a size to.
- **The markup is editable.** The HTML view is a textarea over a highlighted copy of itself, the same shape as the test editor, coloured line by line by `hlMarkupLine` whether the line came from the page or from what is being typed. Edits do nothing until **Save**, which writes the markup back as `srcdoc` (plus the runner's own `<base>`, which the view skips) so the page is parsed again and its scripts run: the buttons still work, and what the page held in variables starts over. Saved markup then **is** that site's page, kept per site in `editedHtml` in `state.js` and served by `loadApp`, so a run starts every test from it; **Reset** clears it and brings the file back. It is never stored, like the catalog. Saving harvests the catalog again, so new elements are offered by autocomplete — but harvests only add, so names an edit removed linger until **Reset**. While there are unsaved edits the view stops reading the page, and **Revert** or any page load drops them.
- **Toolbar order** is Run, Stop, Record; in Step by step mode Run becomes Next step, with no separate button. The per-test button in Results is also called Run, labelled “Run only <title>” for screen readers.
- **Shareable links.** The example showing is the URL's hash (`.../#coupon-code`), so a link opens what you were looking at, and **Share** in the app bar copies that link. `share.js` owns it: boot reads the hash, and with no hash (or an unknown id) opens the first example in the manifest rather than the one visited last, `selectSite` replaces the hash rather than pushing it (walking 100 examples must not fill the back button), and `hashchange` follows a link pasted into the bar. The hash is used rather than a query so the link works from a subfolder on GitHub Pages with no server rule behind it. The name and icon in the app bar are a link to `./` — home, which is the first example, so `/` and `#address-form` show the same thing; the link is relative so it stays inside a subfolder. `index.html` is dropped from the link and from the address bar, so what Share copies and what the bar shows is `.../#newsletter-signup`, never `.../index.html#newsletter-signup`.
- **Copy** is sentence case, with error messages that say how to fix the problem.
- **Accessibility.** Visible focus rings, real labelled buttons, `aria-pressed`/`aria-expanded`, keyboard support in the picker and dialog, `prefers-reduced-motion`.
- **Storage.** Keys carry no version suffix: `live-test-runner` (tests per site), `:history`, `:status`, `:site-keys`, `:layout` (the two column widths, the editor and coverage heights, the site view and the screen size). Wrap every access in `try/catch`, and read defensively so a stored shape you no longer write cannot break a load — every read already falls back to its default on anything unexpected.
- **The site catalog.** `catalog.js` reads the live iframe into a per-site list of what a step could target: clickables, fields, selects and their options, toggles, and the page's text. It reads the page exactly as the recorder does, through `targetParts`, so anything it offers is something `find.js` can locate. Hidden elements are kept (an error message already in the DOM is a fair `expectText` target) and harvests only ever add, so a screen a run passed through stays known. It is harvested on every frame load and after every step, cleared for every site by **Reset**, and never stored.
- **UI coverage.** `coverage.js` is the catalog joined to the run: of the controls a site offers — the catalog's clickables, fields, selects and toggles, never its headings or text — how many did the tests actually use? What counts is measured as the run happens and never by reading the file: a step that passed credits the element it landed on, under the very key `catalog.js` lists that element under (`keyFor`), so `- click: Apply` credits the entry written `{ role: button, name: Apply }` and there is no second matching rule to keep in step with `find.js`. Flows, `beforeEach` and `${unique}` come free, because a step is credited after it ran. Each control ends up **used** (a `click`, `fill`, `select`, `check` or `uncheck` landed on it), **checked only** (an `expectVisible` or `expectText` did, which is not the same thing and reads as its own group) or **untested**; hidden ones stay in the denominator, because a control behind a screen no test opens is exactly what should count against you. A full run clears the score first, so it describes that run; running one test adds to it. Like the catalog it is never stored, and **Reset** clears it. A select counts as one control and says how many of its options a test has picked. Every untested row carries **Add test**, which writes a whole `test:` block for that control at the end of the file through the recorder's `addTest` — a control nothing reaches needs a test of its own, not a step bolted onto whatever test happens to be last — so the panel is a to-do list rather than a report. The title says what the test does (“Clicks Apply”, “Fills Coupon code”), numbered if the file already holds that title, and an empty file is fair game: what the button will not write into is a file that does not parse. The button goes once it has written its test and the row reads “test added” instead: the file is the record, and a second click would only repeat it. A full run or **Reset** settles that mark, the way it settles the score.
- **Autocomplete.** `complete.js` is two halves: `context()` reads the caret and says what may go there, `itemsFor()` fills that slot from the site catalog. An action only ever offers what it could act on, so `select:` lists that page's `<select>`s with their own options and `check:` only its boxes. It opens on the characters that start something new and on Ctrl+Space, closes when there is nothing left to choose, and owns Tab and Enter while it is open — which is what `completionOpen` in `state.js` tells the editor. The list is on `<body>` in viewport coordinates, because a panel clips what overflows it; on a phone it spans the editor instead of following the caret.
- **The test API.** `main.js` puts `window.playlive` on the page for Playlive's own tests. Add to it rather than reaching into modules from a test.
- **Exports** carry no comments and must keep the runner's meaning: fresh page per test, partial matching for `expectText`, visible text only for `expectNoText`, per-step timeouts, `${unique}`. Update both exporters when matching rules change.

## Known limits

- Same-origin pages only. Other local sites need a reverse proxy, or a script that talks to Playlive over `postMessage`.
- Clicks and typing are DOM events (`isTrusted` is false). Uploads, downloads, extra tabs and native dialogs are out of scope.
- Exports are syntax-checked, not executed; run each framework once for real before relying on it.
