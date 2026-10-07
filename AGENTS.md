# AGENTS.md

For AI coding agents working on **Playlive**: a browser-based end-to-end test runner. You write tests in a small YAML format, pick an example site, press **Run**, and watch the steps happen in an iframe. Tests export to Playwright and Cypress.

Everything is client-side and buildless: the files are served exactly as they are. There is no bundler and no install step, but the app must be **served over http** rather than opened from disk, because it uses ES modules.

Lines marked **Decided:** are settled calls. They record something that was tried or argued and is not open again; change one only if asked.

## Layout

```
index.html                The page: markup only, plus <script type="module" src="src/main.js">
src/app.css               All of the app's styles
src/*.js                  The app, as ES modules (see below)
examples/<id>/index.html  One example site per folder, a real page the iframe loads
examples/<id>/tests.yaml  That site's example tests
examples/<id>/bugs.js     Optional: ways that page can be broken, for a bug hunt
examples/examples.js      The manifest: name, category, host, accent, storage keys
examples/site.css         The stylesheet every example page shares
examples/hooks.js         Loaded first by every example page: $(id), error and storage hooks
tests/unit/               Unit tests: node --test, jsdom (dev only)
tests/e2e/                Playwright suite, driving the real app (dev only)
tests/server.mjs          The static file server both suites are served from
```

The modules, roughly in dependency order: `dom` (elements) · `state` · `util` · `icons` (one SVG per category) · `sites` (loading a site, saved tests) · `find` (locating elements, "did you mean…?") · `actions` (what a step does) · `parse` · `history` · `snapshots` · `htmlview` · `results` · `run` · `recorder` · `catalog` · `coverage` · `bugs` · `complete` · `exports` · `dialog` · `picker` · `share` · `editor` · `ui` · `layout` · `modes` · `main` (wiring and boot).

Three rules keep the modules working without a bundler:

- **Only `main.js` boots anything.** Other modules may register their own listeners, but nothing calls across modules at load time. Import cycles are fine as long as that holds.
- **Shared mutable state lives in `state.js`** (`running`, `stopRequested`, `currentSite`, `editorSite`, …). Reading an imported binding gives the current value, but only the declaring module can assign, so each one has a setter: `setRunning(true)`, not `running = true`.
- **A module nothing imports from never runs.** `main.js` carries `import './dialog.js';` for exactly that reason.

Runtime dependencies are **js-yaml 4.1.0** from cdnjs (global `jsyaml`) and IBM Plex from Google Fonts. Do not add CDNs, frameworks or a build step without being asked. Dev dependencies add **jsdom** and **js-yaml pinned to that same 4.1.0**, for the unit tests only — the pin has to follow the CDN version, or the tests would parse differently from the app. Keep every path relative, so the app works from a subfolder on GitHub Pages, and keep images inline: the published page runs under a CSP that allows **no remote images**.

## Checking your work

```sh
npm install && npx playwright install chromium   # once
npm run test:unit                                # ~2s, no browser, no network
npm run test:e2e                                 # ~1.5 min, must be green
npm test                                         # both, unit first
npm run lint && npm run lint:css                 # both must be clean
npm run serve                                    # http://localhost:4173
```

**Which suite a check belongs in.** A function of a string or a page — does this parse, what does this export say, what does this smell of, what would autocomplete offer here — goes in `tests/unit/`. Anything only a browser can answer honestly — is this visible, did this run go green, does this fold without the page scrolling, do these keys reach the right control — goes in `tests/e2e/`. **Nothing is asked twice:** when a rule moves to a unit test, the Playwright test that drove it through the editor goes, and the spec's header says where. `npm run test:unit:watch` reruns the affected file on save.

**The unit environment** (`tests/unit/env.mjs`) builds a document from the real `index.html` with jsdom, since every module imports `dom.js`, which reads the page's elements at load time. It hands back `load()` (a module), `site()` (markup in the app's iframe), `spec()` (the editor's file) and `corpus()` (all hundred examples' tests, off disk). Three gotchas:

- A module must be imported **after** the document exists: `await load(...)`, never a static `import`.
- jsdom has no layout, so `visible()` is false for everything. **Nothing in `tests/unit/` may ask whether an element is visible.**
- Frames are queued, not run — `editor.js` keeps a standing `requestAnimationFrame` loop, right in a browser and endless in Node. `flushFrames()` runs what piled up.

**The Playwright suite** starts its own server and needs network for js-yaml. It derives the site list from `examples/examples.js`, so a new example gets a test automatically, and runs one worker per core (CI gets two).

- **Decided:** the **Flaky** category is skipped by the run tests, since those examples fail on purpose. The category says so (`SKIP` in `examples.spec.js` reads the manifest), never a hand-kept list of ids.

Linting is dev-only: nothing is compiled. `eslint.config.js` lints `src/`, `examples/` and `tests/`; `.stylelintrc.json` lints the two stylesheets, with the rules that argue with this sheet's style off and the ones that catch mistakes on. Inline `<style>`/`<script>` are not linted. Both have a `--fix` twin.

If you touched layout, screenshot and look: the desktop page must never scroll, panels scroll inside themselves. Add a test alongside any new action, exporter rule or site — in whichever suite can answer it without a browser.

## The YAML format

```yaml
vars:                       # used as ${name}; ${unique} is new on every run
  email: ana@example.test
beforeEach:                 # runs at the start of every test
  - fill: { label: Email, value: "${email}" }

test: Shows the dashboard   # every test starts with "test:" at column 0
steps:
  - fill: { label: Password, value: hunter2 }
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000           # optional per-step wait, in ms
```

- Tests are top-level `test:` blocks, titled with `test:`. There is one way to write a file: the shapes the format used to have — a `tests:` list, a `site:` line, a `flows:` block pulled in with `- use:` — are gone from the parser, and a file using one gets the ordinary "Unknown setting" or "unknown action" error.
- Each test starts from a fresh page at `/` and must not depend on other tests.
- Only `vars`, `beforeEach` and `failOnPageErrors` may appear before the first test. A file belongs to whichever site is selected, so it never names one. A step is written where it runs; shared openings go in `beforeEach:`.
- Targets describe what a user sees: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a bare string meaning `{ text }`.
- **The value goes inside the target**, so a step is one line: `- select: { label: Country, value: United Kingdom }`. A `value:` on its own line is an error that says so. Inside the braces, quote any value holding `,` `:` `{` `}` or a `${var}`.
- `timeout:` goes inside the target too, or on its own line for the steps that have no target (`expectText`, `expectNoText`, `wait`). `expectTextInRange` has braces without a target, and takes its `timeout:` in them or on its own line.

Actions: `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectTextInRange`, `expectVisible`. There is no navigation step: a test starts on the site's page and stays there, and the exports open `/` for every test. Steps wait up to 4s (`TIMEOUT`) unless they set `timeout:`.

**`expectTextInRange` checks a number that moves.** `- expectTextInRange: { text: Ends in, min: 1, max: 24 }` reads the **first number on the page's first visible line holding that text** — commas taken out, so `12,400` is 12400 — and passes while it is between the two ends, inclusive. It is the fix for a check that is only true on the day it was written: a countdown, a count that grows, a computed value with a healthy band (`bmi-calculator`). It is an assertion like the others, so it answers an Unknown Test. It is the one check with no target, which is why **both exporters read the page's text rather than a locator — keep the three readings in sync** if the rule ever changes. Its only keys are `text`, `min`, `max` and `timeout`.

Adding an action means updating **all** of: `ACTIONS`, `normalizeStep`, `describeStepBase`, `toPlaywright`, `toCypress`, `ASSERTIONS` in `parse.js` if it is a check, `KINDS` in `complete.js` if it takes a target, and one example site that uses it — one the run tests actually run, which the **Flaky** examples are not.

The format and every error it gives are pinned in `tests/unit/parse.test.mjs`.

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

- **Order matters.** Categories run in manifest order and ports run 3001–3100 down that list, but **within a category the sites are sorted by name**, so adding one inserts it alphabetically. **Shopping** leads, and the first site of the first category is home, so `/` and `#address-form` are the same page.
- **One theme per category, one word** — a kind of app someone would recognise, never a mechanism. The sixteen, in manifest order: Shopping, Support, Accounts, Admin, Travel, Banking, Search, Social, Inbox, Productivity, Media, Health, Dashboards, Learning, Games, Flaky.
  - **Decided:** no **Misc** and no **Forms**. A catch-all is where a site goes when nobody has decided what it is, and a form is a widget, not a kind of app. A new example either fits a theme or is worth a theme of its own.
  - **Decided: Flaky** is the one category named after a mechanism, because the mechanism is the lesson, and it stays last. One app, **Weather app**: two independent draws, so a different test goes red each run and the repetitions control is how you watch it. Its tests must *mostly* pass — one that always fails is just broken. Their fix, `expectTextInRange`, is deliberately **not** in the file: you meet the problem here and the answer in `bmi-calculator`. A new site goes here only if being unreliable is the whole point.
- **An icon per category** in `icons.js`: inline SVG, 24x24, stroke-only, so `svg.i` sizes it and `currentColor` tints it. Drawn tinted with the accent in three places — the picker's category heads, the example button, the Site panel's badge. A category with no icon falls back to the neutral `fallback`; give a new theme its own in the same change.
- **Accent per category,** in both the manifest and the page's `--accent`: Support `#0f766e`, Accounts `#1d4ed8`, Admin `#475569`, Shopping `#b45309`, Travel `#0e7490`, Banking `#a16207`, Search `#0369a1`, Social `#be185d`, Inbox `#4338ca`, Productivity `#7c3aed`, Media `#a21caf`, Health `#4d7c0f`, Dashboards `#5b21b6`, Learning `#78350f`, Games `#9f1239`, Flaky `#b91c1c`.
  - A page's `--accent` is a separate palette from `--pass`/`--fail`/`--running`, which keep their meanings in the app's chrome. The picker reads a category's dot from its *first* site's accent.
  - **Decided:** sixteen is about as many hues as this scheme carries, and the order keeps lookalike pairs apart. A seventeenth theme needs the picker to group themes under coloured sections instead.
- **Write ordinary HTML and JavaScript.** `hooks.js` gives every page `$(id)` for `document.getElementById`. The page is a real file, so there is nothing to escape.
- **Make it testable the way a person would describe it:** real `<label for>`, real buttons, an `aria-label` when buttons share text ("Add Coffee beans to cart").
- **Keep it deterministic.** Only **Flaky** may be random, slow or clock-dependent. A game picks a fixed card or move order rather than shuffling.
- Give it a kebab-case id, used as its folder name, name it after what it demonstrates, and write 2–5 tests covering the main path and its errors.
- A site that writes storage keys before Playlive can see them lists them as `storageKeys` in the manifest, so **Reset** still clears them.
- **`expectNoText` sees every bit of visible text, `<option>` labels included,** so asserting a row is gone needs a string the row's `<select>` cannot also hold: `"Invoice #4821 · no label"`, not `"Invoice #4821"`. A `#` in a target must be quoted, or YAML reads it as a comment.

Ports, ordering, accents, icons, the page agreeing with the manifest and the test count are all pinned in `tests/unit/examples.test.mjs`.

## Conventions

### Look and feel

- **Colors mean things.** Grey `--active` is running, green `--pass`, red `--fail`. Yellow `--running` is the line a run is on in the editor and the HTML view, and the middle score band. Blue `--run` is for interactive controls only — **never show progress in blue**.
- **Scores band in three:** green at 100%, `--warn` from 60% (its readable `--running-ink` where the colour is text), red below. Coverage's groups are green used, `--warn` checked only, red untested, with the dots differing in **shape** as well — solid, ringed, hollow — so the list never leans on colour alone.
- **Theming.** Define every color three times: light, `prefers-color-scheme: dark`, and `[data-theme="dark"]`.
- **Sizing is mobile first.** `:root` holds the touch-sized control tokens (`--tap`, `--btn-font`, `--btn-pad`, `--ctl-font`, `--icon-tap`, `--chev`, `--code-font`, `--code-line`, …) and `@media (min-width:901px)` redefines them smaller for a mouse. Size controls with the tokens, not literals. `--ctl-font` stays 16px on phones because anything smaller makes iOS zoom on focus. A test measures every visible control at 360, 390 and 768px.
- **Copy** is sentence case, with error messages that say how to fix the problem.
- **Accessibility.** Visible focus rings, real labelled buttons, `aria-pressed`/`aria-expanded`, keyboard support in the picker and dialog, `prefers-reduced-motion`.
- **Scrolling.** Never call `scrollIntoView` inside the iframe; it scrolls the outer page. Use `scrollWithinFrame` and `followInResults`.

### Watching a run

- **Following is not optional, and has no toggle:** the editor marks the line of the running step, Results keeps that step in view, the HTML view keeps its line in view. A run is meant to be watched.
- **The Results head counts the run in circles** under **Steps:**, one per step, cumulative over the whole run rather than the test running now. All drawn hollow before the run starts and filled as it reaches them, so the row says how long the run is as well as how far it has got; a test that fails part way leaves the rest hollow. Beside them a summary says how far it has got and **names no test**. An edit clears both.
- **Results** are folded by default, and folds the user opens stay open across runs (`expandedTests`).
- **The flaky badge** is for a test that passes and fails without being changed, so a test that is failing *now* never carries it.
- **Toolbar order** is Run, Stop, Record; in Step by step mode Run becomes Next step, with no separate button. The per-test button in Results is also Run, labelled "Run only &lt;title&gt;" for screen readers.

### Modes

**Modes say what the app is for right now** (`modes.js`). The choice sits in the app bar left of the example, because it decides which panels exist rather than what one of them shows. In the order you meet them: **Explore** (the examples and their tests), **Create** (the file taken away, written back from the titles), then the three that judge what you ended up with — **Coverage**, **Mutation**, **Smells**, each with one panel of its own.

- The mode is on `<html>` as `data-mode`, which is how the stylesheet hides the panels a mode has no use for and starts the column at heights the rest will fit in. `index.html` ships it set to Explore so nothing flashes before the module runs.
- The value lives in `state.js` — the picker, the sites and the editor all read it and none should import a panel to. `modes.js` owns what changing it *does*. Boot passes `{ initial: true }` so the handovers do not run against an empty editor.
- Kept in `:layout`, like the column widths: it is about this browser, so **Reset** leaves it alone. A change re-clamps the stored heights (`reclamp` in `layout.js`).
- Leaving Mutation repairs an injected page: nothing should outlive the panel that explains it.
- Adding a mode means a `MODES` entry, a button in the seg, and the CSS that says which panels it has.
- **Decided:** one mode, one question, one panel. Mutation showed Coverage above its own panel once; two scores in one column only asked the reader to work out which they were looking at.
- **Decided:** the selected button is filled, ink on panel, rather than merely lifted like the other segmented controls — the mode governs the whole column.

**The feature is called Mutation on screen and `bugs` in the code.** Copy says mutation; `bugs.js`, `#bugs`, `data-mode="mutation"`, `examples/<id>/bugs.js` and the manifest's `bugs: true` keep the older name. Renaming is a mechanical change across a hundred examples and has not been made.

### The left column

**It holds as many panels as the mode has:** Tests and Results in Explore, and the mode's own panel third in each of the other four, with a handle between them.

- **Results folds in three stops** from one button, which always says what the next press does: every test's steps shown, then hidden, then the panel down to its one row. Coverage, Mutation and Test smells fold the same way, score and actions still on the row, with Results taking the room back.
- **Folding the code is a fold like the others:** `data-spec` on `#left`, beside `data-results`, `data-cov`, `data-bug`, `data-smells`.
- Heights are `--editor-h`, `--cov-h`, `--bug-h`, `--smell-h`, `--create-h`. The clamps in `layout.js` keep the desktop page from ever scrolling: no handle may squeeze the panel below it past its floor, and in Mutation the Tests panel gives way too rather than being the one thing that cannot shrink.
- Clamps **measure what is on screen** rather than asking which mode is on — a panel the mode does not have measures zero and asks for nothing. `clampEditor` measures the Results floor rather than assuming it.
- A fold that leaves nothing above a handle hides that handle. A handle whose panel can no longer give moves the one boundary above it that can — the editor's (`editorForHandleTop`, used by Coverage's and Test smells').
- **Two rules hold across every combination of folds**, and a test sweeps all of them in all four modes: a folded panel is never the one that grows, and the room always goes to something with content — the mode's own panel, falling back to Results, then the editor. Fold everything and the column simply ends: a gap is honester than a blank panel.
- **On a narrow screen the panels stack** in order, the site between the first two, and **the test code starts folded** — a screenful of YAML would push the site and its results off the bottom. `main.js` folds it at boot under 901px; the Tests panel's button brings it back. The file is untouched either way.

### The app bar

**The mode and the example live here** — the mode first (`modes.js`), then the example (`picker.js`): its name with category icon and pass/fail dot, its list, the stepper that walks the 100 examples — plus **Reset**, so the two things every panel depends on read first.

- **Reset is the one way back to the start, and it is global:** it reloads the page showing and clears everything kept for *every* example — saved tests, the sites' stored data, run history, statuses, catalogs, edited markup, the last result — leaving none of our keys in storage. Layout and theme stay: they are about this browser. `resetAll` in `main.js` owns it; there is no separate reload button in the bar.
- On a phone the bar is exactly three full-width rows: the mark and name with **Reset**, **Share** and the repository (names kept, tightened to fit); the mode, two names at half width; the example's list and stepper sharing 60/40.

**Shareable links.** The mode and the example are the URL's hash (`.../#create#coupon-code`), each half left out when it is the default, so a link opens what you were doing. **Share** copies it. `share.js` owns it:

- Boot reads the hash; with no hash, or an unknown id, it opens the first example in the first mode — never the one visited last. A link's mode wins over the one the browser remembers.
- `selectSite` **replaces** the hash rather than pushing it: walking 100 examples must not fill the back button.
- `hashchange` reads **both halves before applying either**, because changing the mode writes the address and would take the example out of the hash before it was read.
- **Decided:** a hash, not a query, so the link works from a subfolder on GitHub Pages with no server rule. The name and icon link to `./`; `index.html` is dropped from the link and the address bar.

### The site panel

**Two views, Site and HTML,** remembered in the layout. Its head keeps what is about the page on screen — Site/HTML, the reload, screen size — in two full-width rows on a phone.

**The HTML view** (`htmlview.js`) reads the markup back out of the live page after every load and every step — so typed values and revealed screens are really there — and marks the line the step acted on green or red, following it the way Results follows a step.

- The action's name goes in the **gutter**, in place of that line's number, so the markup never shifts to make room. That lane is a fixed width for the same reason.
- **Decided:** the page stays laid out underneath, covered rather than hidden — a step can only find an element the browser is still giving a size to.

**The markup is editable:** a textarea over a highlighted copy of itself, the same shape as the test editor, coloured by `hlMarkupLine`.

- Edits do nothing until **Save**, which writes the markup back as `srcdoc` (plus the runner's `<base>`, which the view skips) so the page is parsed again and its scripts run.
- Saved markup then **is** that site's page, kept in `editedHtml` in `state.js` and served by `loadApp`, so a run starts every test from it. Never stored; **Reset** brings the file back.
- Saving re-harvests the catalog — but harvests only add, so names an edit removed linger until **Reset**.
- While there are unsaved edits the view stops reading the page. **Revert** or any page load drops them.

**The test editor does not copy or paste.** Copy, cut, paste and a dropped selection are all refused on `#spec` (`REFUSED` in `editor.js`), each with a line saying why.

- **Decided:** writing the step is the exercise. A file that can be shuffled from one example into another — or pasted in from outside — turns Create into a copying exercise with the answer one mode away. **Export** is the deliberate way out.
- The runner, the recorder and the tests write the file through its `value`, not the clipboard, so none of this is in their way.

### The four scores

Four panels read the same two sources — **the catalog** (what the page offers) and **the run** (what the tests did). Shared rules: none of the four is ever stored, **Reset** clears all of them, and each bands green at 100%, `--warn` from 60%, red below (Smells bands in two: `--warn` when it found something, green when not).

**The site catalog** (`catalog.js`) reads the live iframe into a per-site list of what a step could target: clickables, fields, selects with their options, toggles, and the page's text. Harvested on every frame load and after every step.

- It reads the page **exactly as the recorder does**, through `targetParts`, so anything it offers is something `find.js` can locate.
- **Decided:** hidden elements are kept — an error message already in the DOM is a fair `expectText` target.
- **Harvests only add**, so a screen a run passed through stays known (and names an edit removed linger until **Reset**).

**UI coverage** (`coverage.js`) is the catalog joined to the run: of the controls a site offers — clickables, fields, selects, toggles, never headings or text — how many did the tests use?

- **Measured as the run happens, never by reading the file.** A passed step credits the element it landed on, under the very key `catalog.js` lists it under (`keyFor`) — so there is no second matching rule to keep in step with `find.js`, and `beforeEach` and `${unique}` come free.
- **used** (`click`/`fill`/`select`/`check`/`uncheck`) · **checked only** (`expectVisible`/`expectText`) · **untested**. A select is one control and says how many options were picked.
- **Decided:** hidden controls stay in the denominator — one behind a screen no test opens is exactly what should count against you.
- A full run clears the score first; running one test adds to it.
- **Every untested row carries Add test**, writing a whole `test:` block at the end of the file via the recorder's `addTest`, titled for what it does ("Clicks Apply"), numbered if taken. An empty file is fair game; one that does not parse is not. The button goes once used and the row reads "test added"; a full run or **Reset** settles that mark.
- **Decided:** a whole test, not a step bolted onto whatever test happens to be last — the panel is a to-do list, not a report.

**Mutation** (`bugs.js`) asks the harder question: would the tests *notice* the page going wrong? A green 100% that catches nothing teaches the wrong lesson.

- A site may ship `bugs.js` — `{ id, title, find, replace }` patches on the page's own source — and `bugs: true` in the manifest, which is what stops the app fetching a file that is not there.
- **Run mutations** runs the suite against the page as it ships, **refuses to go on unless that is green** (a red suite would call every bug caught), then injects each bug in turn. Tests fail → **caught**; all pass → **escaped**; a `find` that no longer matches → **no longer applies**, not a free point.
- **Decided:** the escaped group leads the list — each row names a test nobody has written.
- Served like edited markup, as `srcdoc` from `bugHtml` in `state.js`, so every test meets the broken version. **Inject** leaves one on the page, and something always says so: a red bar over the site, or the same message in the Revert/Save row when the markup is showing.
- The HTML view marks the changed line, named `bug` in the gutter — only if the line holds the new text *and* is not one the page always had. `bugs.js` pushes that mark into `htmlview.js` rather than being read from it, so the view never calls across at load time.
- `hunting` keeps a hunt's failures out of run history, off the pass/fail dot and off the coverage score.
- **Adding a bug** means a plausible mistake and a `find` that appears **exactly once**; a site's first bugs mean the file, the manifest key, and a test.

**Create** (`create.js`) takes the file away: the editor starts as nothing but the titles of the tests the example ships, written as comments.

- **Decided: the titles are the whole brief.** "Shows an error for a missing ZIP" says what the test must prove without saying which control to click — that is the part worth working out. The real tests are one mode away rather than hidden.
- **The one mode that changes what the editor holds,** so it keeps a file per site: `createTests` beside `savedTests` in `sites.js`, chosen by `bufferFor(mode)`, stored under `:create`. Every read and write goes through `testsFor`/`stashEditor`, so neither file can overwrite the other.
- A title is **done** when the file holds a `test:` with that title **exactly** and that test makes every check the example's own test makes — among its *own* steps, never one from `beforeEach`, on either side.
- A test that checks nothing is **not offered as a brief** (`titlesOf` skips it): a brief is "prove this". That is also what lets an example ship an Unknown Test for Smells mode without failing its own briefs.
- The panel is a board — **TODO**, **DOING**, **DONE** — the one place the app shouts, because they are column names rather than sentences. Rows go to their line: the test if written, its comment if not. It follows the file as typed; it does not ask the run.
- `ASSERTIONS` in `parse.js` is the one list this and the Unknown Test smell both read.

**Test smells** (`smells.js`) is the only score that reads the *file* rather than a run, redrawing from `preview()` as the editor is typed.

| Smell | What it names |
|---|---|
| **Unknown Test** | A test with no check of its own. `beforeEach` assertions do not count: they are not what *this* test claims. |
| **Eager Test** | `EAGER` (4) or more **assertion phases** — runs of checks separated by the steps between them. Four tests wearing one title, and the Results row can only name the first that broke. A phase is one run however many checks are in it. |
| **Assertion Roulette** | More than `ROULETTE` (5) **checks**. A step carries no message of its own, so when one of a long row goes red, the row is all there is to read. |
| **Magic Value** | A value a `fill` or `select` types, written out on more than one line. Once is a value; twice is a value with no name, and `vars:` is where a name goes. |
| **Duplication of Setup** | Every test opening with the same steps. Takes at least two tests, compares each test's *own* steps, reports the shared opening step by step. |

- Each smell is a heuristic **with a name**, and the name is the point: a student who can say "that is Duplication of Setup" has something to look up. The panel prints the sentence under the name rather than hiding it in a tooltip — one sentence, what is wrong and what to do.
- Every row goes to its line (`jumpToLine` in `editor.js`, which the error box uses too). **A smell with no line to show is not offered.**
- Both thresholds were measured from the corpus, not guessed; `tests/unit/smells.test.mjs` pins them and what the rules make of all 100 examples, so an accidental smell in a new example fails the suite.
- A test can be both Eager and Roulette — different diagnoses. Eager pairs with Duplication of Setup: splitting one leaves the same opening in each half.
- **Decided: Magic Value reads the value, not numbers inside a check's text.** Counting those flagged 93 of the hundred examples; counting values flags ten, every one real. A value from `vars:` is not on its own step's line — that line says `${name}`.
- **Decided: a smell that cries wolf teaches people to ignore the panel.** Each stays silent when unsure, and a file that does not parse is left to the error box.
- **Two tabs, two questions.** **This file** is what the tests on screen smell of. **All smells** is the catalogue: every smell with its sentence whether or not anything has it, and under each the examples that do (`scanSites`, once per entry to the mode). A row opens that example, in the file tab, at the line — a way into the hundred examples rather than a glossary. Both follow the editor as typed; the tab is never stored. The panel keeps its own height (`--smell-h`) so switching tabs moves nothing.
- **Decided:** the mode does **not** narrow the example list. It did once, and hiding the clean examples hid the ones worth comparing the smelly ones with, and made the list change length under you.
- **Seven tests are deliberately smelly** — two Unknown Tests, three Eager Tests, two Assertion Roulettes — each commented as such, over seven examples. A panel that names five smells and can show you two teaches half of what it knows.
- **Adding a smell** means an entry in `SMELLS` with its sentence, a rule in `report`, a test for what it catches *and* what it must not, and — if nothing in the corpus has it — an example that does.

**Coverage and Mutation are two panels in two modes, never both at once.** **Run mutations** lives in the Mutation panel's head, where the other panels keep their actions, and greys out with every other control while the runner is busy: `run.js` announces that as `playlive:busy` and `bugs.js` listens, the same way it listens for `playlive:site` — rather than either module reaching into a panel it knows nothing about.

### The rest

- **Autocomplete** (`complete.js`) is two halves: `context()` reads the caret and says what may go there, `itemsFor()` fills that slot from the site catalog. An action only ever offers what it could act on, so `select:` lists that page's `<select>`s with their own options and `check:` only its boxes. It opens on the characters that start something new and on Ctrl+Space, closes when there is nothing left to choose, and owns Tab and Enter while open — which is what `completionOpen` in `state.js` tells the editor. The list is on `<body>` in viewport coordinates, because a panel clips what overflows it; on a phone it spans the editor instead of following the caret.
- **Storage.** Keys carry no version suffix: `live-test-runner` (tests per site), `:create`, `:history`, `:status`, `:site-keys`, `:layout` (column widths, panel heights, site view, screen size). Wrap every access in `try/catch`, and read defensively so a stored shape you no longer write cannot break a load. **Never stored:** the catalog, the coverage score, anything about bugs, the smells tab.
- **Exports** carry no comments and must keep the runner's meaning: fresh page per test, partial matching for `expectText`, visible text only for `expectNoText`, per-step timeouts, `${unique}`. Update both exporters when matching rules change.
- **The test API.** `main.js` puts `window.playlive` on the page for Playlive's own tests. Add to it rather than reaching into modules from a test.

## Known limits

- Same-origin pages only. Other local sites need a reverse proxy, or a script that talks to Playlive over `postMessage`.
- Clicks and typing are DOM events (`isTrusted` is false). Uploads, downloads, extra tabs and native dialogs are out of scope.
- Exports are syntax-checked, not executed; run each framework once for real before relying on it.
