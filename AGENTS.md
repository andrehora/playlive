# AGENTS.md

**Playlive** is a browser-based end-to-end test runner for students. You write tests in a small YAML format, pick an example site, press **Run**, and watch each step happen in an iframe. Tests export to Playwright and Cypress.

It is client-side and buildless: files are served as they are, with no bundler or install step. It uses ES modules, so serve it over http (`npm run serve`) rather than opening it from disk.

**Decided:** marks a settled choice. Don't reopen one unless asked.

## Layout

```
index.html                Markup only, plus <script type="module" src="src/main.js">
src/app.css               All app styles
src/*.js                  The app shell, shared by every mode (main, modes, share, layout, picker, state, ui…)
src/html/                 The HTML mode: the sites, the YAML format, its runner and graders
src/code/                 What Python and JS/TS share: their panels, graders, coverage and flow
src/code/python/          Python's profile and its Pyodide worker
src/code/js/              JS/TS's profile, its worker, and the token-based tools the worker uses
examples/html/<id>/index.html  One example site per folder (a real page the iframe loads)
examples/html/<id>/tests.yaml  That site's tests
examples/html/<id>/bugs.js     Optional mutations for the Mutation tab
examples/html/examples.js      Manifest: name, category, host, accent, storageKeys, bugs
examples/html/site.css         Shared stylesheet for example pages
examples/html/hooks.js         Loaded first by every example: $(id), error and storage hooks
examples/code.js               The code modes' manifest, one for Python and JS/TS: groups, ids, what each teaches
examples/python/<id>/          <module>.py, and the same tests in unittest/ and pytest/ (test_<module>.py)
examples/javascript/<id>/      <id>.js and <id>.ts, tests in jasmine/<id>.spec.js|ts and mocha/<id>.test.js|ts
tests/unit/               node --test + jsdom
tests/e2e/                Playwright, driving the real app
tests/server.mjs          Static server for both suites
```

**Decided:** a module lives in the folder of the mode it serves; one used by more than one kind of mode lives in `src/` itself. Within a folder the name drops the prefix (`code/mutation.js`, not `codemutation.js`). Modules, roughly in dependency order:

- **`src/`:** `dom` · `state` · `util` · `lists` · `suggestlist` · `editkeys` (the comment shortcut and undo every editor has) · `ui` · `picker` · `share` · `layout` · `modes` · `main`
- **`html/`:** `icons` · `sites` · `find` · `actions` · `parse` · `history` · `snapshots` · `htmlview` · `results` · `run` · `recorder` · `catalog` · `bugs` · `create` · `smells` · `complete` · `exports` · `dialog` · `editor`
- **`code/`:** `logos` · `highlight` · `snippets` · `flow` · `core` · `coverage` · `mutation` · `smells` · `create` · `code` · `complete`, with `python/python` and `js/javascript`, the two profiles

`code/python/worker.js` and `code/js/worker.js` (with `code/js/sourcemap.js`, `code/js/tokens.js`, `code/js/cover.js`, `code/js/mutate.js` and `code/js/flow.js`; `code/js/smells.js` is read on the page too) are the code modes' workers, imported by nothing on the page. The code modes' state shared by their panels (`active`, `creating`, `job`, `view`) lives in `code/core.js` with setters, as `state.js` has it; a panel module reads it, and `code/code.js` changes it. Each panel registers the worker messages it handles with `onWorker` (also in `code/core.js`), builds what a job sends with `request`, and disables its own buttons on `playlive:code-job`. A grader's list (Mutation, Smells, Create, in either kind of mode) is built with `lists.js`.

### Module rules (no bundler)

- **Only `main.js` boots anything.** Other modules may register listeners but never call across modules at load time. Import cycles are fine because of this.
- **Shared mutable state lives in `state.js`**, each with a setter: `setRunning(true)`, not `running = true`.
- **A module nothing imports never runs.** That is why `main.js` has `import './html/dialog.js';`.
- Modules talk through events rather than reaching into each other's panels (e.g. `html/run.js` emits `playlive:busy`, `html/bugs.js` listens).
- `window.playlive` is the test API. Add to it rather than reaching into modules from a test.

### Dependencies

Runtime: **js-yaml 4.1.0** from cdnjs (global `jsyaml`), IBM Plex from Google Fonts, and **Pyodide 314.0.7** from jsDelivr (Python mode only, imported by `code/python/worker.js`; pytest comes from its package set, unittest from the standard library). JS/TS mode fetches **Jasmine 7.0.2**, **Mocha 12.0.3**, **Chai 5.2.0**, **Sinon 22.1.0** (with Mocha, which has no stubs of its own; Jasmine has `spyOn`) and **TypeScript 5.9.3** from cdnjs, in `code/js/worker.js`, each only when chosen. Nothing else: no new CDNs, frameworks or build step unless asked. Dev: jsdom, and js-yaml **pinned to 4.1.0** so unit tests parse like the app.

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
beforeEach:
  - fill: { label: Email, value: ana@example.test }

test: Shows the dashboard   # each test starts with "test:" at column 0
steps:
  - fill: { label: Password, value: hunter2 }
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000
```

- Only `beforeEach` and `failOnPageErrors` may come before the first test. A file never names its site.
- `${unique}` in a value changes every run.
- Each test starts fresh at `/` and is independent. There is no navigation step.
- Targets: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a bare string (= `{ text }`).
- **Values and `timeout:` go inside the target braces:** `- select: { label: Country, value: United Kingdom }`. Quote values containing `,` `:` `{` `}` `#` or `${unique}`. Steps with no target (`expectText`, `expectNoText`, `wait`) take `timeout:` on their own line.
- Default timeout is 4s (`TIMEOUT`).
- Old shapes (`tests:` list, `site:`, `flows:`/`use:`) are gone and fail with the normal errors.

**Actions:** `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectNumber`, `expectVisible`.

**`expectNumber`** (`{ text, min, max, timeout }`) reads the first number on the first visible line containing `text` (commas removed) and passes if it's within `[min, max]`. It's the fix for values that drift (countdowns, growing counts). It has no target, so both exporters read page text. Keep the runner and both exporters in sync.

**Adding an action** means updating all of: `ACTIONS`, `normalizeStep`, `describeStepBase`, `toPlaywright`, `toCypress`, `ASSERTIONS` in `html/parse.js` (if it's a check), `KINDS` in `html/complete.js` (if it takes a target), and one non-Flaky example that uses it.

The format and its errors are pinned in `tests/unit/parse.test.mjs`.

## Adding an example site

1. `examples/html/<kebab-id>/index.html`:

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

2. `examples/html/<id>/tests.yaml` with 2–5 tests covering the main path and its errors.
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
- **Decided:** **Flaky** is the exception and stays last. Its one site (Weather app) is random on purpose, and its tests should *mostly* pass. It deliberately doesn't use `expectNumber`; that fix is shown in `bmi-calculator`. Add a site here only if unreliability is the lesson.
- A new category needs an icon in `html/icons.js` (inline SVG, 24×24, stroke-only, `currentColor`).
- Write plain HTML/JS. Make elements testable the way a person describes them: real `<label for>`, real buttons, `aria-label` when buttons share text.
- **Deterministic only.** Outside Flaky, nothing random, slow or clock-dependent.
- If the page writes storage before Playlive can see it, list the keys as `storageKeys` so **Reset** clears them.
- `expectNoText` also sees `<option>` labels, so pick a string no `<select>` on the page holds.
- Pinned in `tests/unit/examples.test.mjs` (ports, order, accents, icons, test count). Test smells across all examples are pinned in `tests/unit/smells.test.mjs`, so an accidental smell fails the suite.

## UI conventions

- **Colours have meanings.** Grey `--active` = running, green `--pass`, red `--fail`, yellow `--running` = the current line. Blue `--run` is only for interactive controls; never use it for progress.
- **Scores band in three:** green at 100%, `--warn` from 60%, red below. Don't rely on colour alone (the dots in the mode panels' lists also differ in shape).
- **Theming:** define every colour three times: light, `prefers-color-scheme: dark`, `[data-theme="dark"]`.
- **Mobile-first sizing:** use the tokens in `:root` (`--tap`, `--btn-font`, `--ctl-font`, …), redefined smaller at `min-width:901px`. No literal sizes. `--ctl-font` stays 16px on phones to stop iOS zoom.
- **Copy:** sentence case. Error messages say how to fix the problem. Tooltips are a few direct words ("Inject this change", "Copy a link"), not explanations; keep a shortcut in them when there is one.
- **Accessibility:** visible focus rings, labelled buttons, `aria-pressed`/`aria-expanded`, keyboard support, `prefers-reduced-motion`.
- **Never call `scrollIntoView` inside the iframe** (it scrolls the outer page). Use `scrollWithinFrame` and `followInResults`.
- **Runs are always followed** (editor line, Results row and HTML view line). There is no toggle.
- **The desktop page never scrolls.** Panel heights (`--editor-h`, `--create-h`) are clamped in `layout.js`. Clamps measure what's on screen, not which mode is active. A folded panel never grows; space goes to Create's panel, then Results, then the editor.
- On narrow screens (<901px), panels stack and the test code starts folded.

## Modes

`modes.js` owns modes; the value lives in `state.js` and on `<html data-mode>`, which the CSS uses to show or hide panels. The app bar asks it as two questions: a **language** (`.area-seg`: Python, JS/TS, HTML for the sites), then **Explore | Create** (`.mode-seg`). Underneath it is still one value (`MODES`: `python`, `python-create`, `javascript`, `javascript-create`, `explore`, `create`); `codeModeOf` in `code/code.js` gives the code mode of either of its two, and code that looks a code mode up goes through it. Changing language keeps the side (Explore or Create) you are on. A profile without `create` would leave Create `aria-disabled` there. **Explore** (examples and tests) and **Create** (write the tests from their titles). The two graders, **Mutation** and **Smells**, are not modes: they are tabs beside **Results** in the Results panel (`setResultsTab` in `html/results.js`, which emits `playlive:restab`), in both modes, as in the code modes. The tab is never stored or put in the hash; Results' fold button folds the whole panel whichever tab is open. Changing mode repairs an injected mutation; changing tab doesn't (the bar over the site says it's there).

- **Decided:** one mode, one question, one panel. Mutation and Smells are tabs, not modes.
- Adding a mode means a `MODES` entry, a button and the CSS for its panels.
- **Code modes: Python and JS/TS** (`code/code.js`, experimental) leave the sites behind: tests on the left, Results and Console tabs below them, the module under test on the right. Both share those panels; a profile (`code/python/python.js`, `code/js/javascript.js`) says what differs: examples, frameworks, languages, highlighting, indenting, how a file's tests are found, and the worker. The picker lists the mode's own examples, and the hash names one (`#python#stack`, `#javascript#cart`, `#python-create#stack`). Every example's tests are written once per framework (pytest/unittest, pytest first; Jasmine/Mocha + Chai) and JS/TS also per language (JS/TS); the switches on the Tests panel pick one (the JS/TS language switch shows only the logos), and a run uses only that framework's own runner. Each mode keeps its own framework, edits and runtime; changing language keeps the example you are on. Entering a mode starts its runtime downloading, so no other mode pays for it. Python's worker is kept between runs (Pyodide is slow to start); JS/TS starts a fresh worker for every run, loading only the chosen framework (and TypeScript when TS is chosen). Stop terminates the worker. Edits are kept per example, framework and language until Reset or a reload, never stored. **Decided:** unlike the YAML editor, the code modes' tests editor allows paste and drop.
- **Coverage** (line coverage, not coverage.py or Istanbul): every code-mode run measures which lines of the module under test ran, whichever tab is open; the worker sends `{ type: 'coverage', file, lines, hit }` (lines from 0) before `done`. Python (`code/python/worker.js`) uses `sys.monitoring` LINE events, each line disabled after its first hit, and counts as code the lines the compiled module has instructions on. **Decided:** `class` and `def` lines count, as in coverage.py: they run when the module is imported, so a test file that only imports it already covers them. Python also measures **branches** (3.14's `co_branches()` with BRANCH_LEFT/RIGHT events), sent as `branches: [[line, ways, taken]]`. **Decided:** a branch is a statement's, in both languages: each `if`/`elif`/`while`/`for` has two ways however many jumps its condition makes (`statement_branches`: true when the body's first line ran, false when a jump left the condition's lines for anywhere but the body); a ternary, or an `and` outside a condition, does not count. JS/TS measures branches too: `code/js/cover.js` wraps each `if`/`while`/`for (;;)` condition (`$brc.b(id, c)`) and each `for…of` iterable (`$brc.i(id, xs)`, into the body or run out), on the same lines; a `for…in`, a `for` with no condition, a ternary and `&&` are left alone, as in Python. JS/TS (`code/js/cover.js`, no parser) tokenizes the file and puts a probe before each statement in a block, on the same line; TS is instrumented after transpiling and mapped back through the source map. If the probed code does not parse it runs as written and the tab says it could not be measured. The Results/Console head holds only a **Coverage** check, no numbers; while it is checked the code panel's head shows the scores, banded like scores (`Line: 84% (11 of 13 lines) | Branch: 50% (2 of 4 branches)`), or why there are none. The two scores are a switch that picks what colours the code: **by lines**, each line light green (ran) or light red (never ran); **by branches** (Python), only the lines with a branch, light green (every way taken), light yellow (some) or light red (none). Also while it is checked, both offer **Code | Flow**: `code/flow.js` draws the control flow of each method with a branch (from `flows`, which `code/python/worker.js` reads from the syntax tree and `code/js/flow.js` from tokens: functions, class and object methods, and arrows given to a name; a loop's `each` says whether it runs out or tests), its boxes coloured by the same choice (a decision by its ways when by branches, every other box by its lines), and a box takes you to its line. Only methods with a branch get a flow. There is no Coverage tab. An edit to the code makes the measure stale until the next run.
- **Code-mode mutation** (the **Mutation** tab after Console; a profile's `mutation: true`). JS/TS makes its mutants on tokens (`code/js/mutate.js`, see Code-mode Create) and runs them like Python, every test of each, in one worker that evaluates the framework again per run; a mutant counts as never run only when its line starts a statement that did not run. Python: like the site modes' Mutation, but the mutations are made, not written. `mutate` in `code/python/worker.js` changes the module on its syntax tree, one change per mutant (comparison, arithmetic and `and`/`or` swaps, an int one more, `True`/`False` swapped, a `not` removed, a returned value replaced by `None`; never in docstrings, f-strings or `if __name__ == "__main__"`), runs every test quietly on each (`failing`, the same quiet runner Create's check uses), and reports caught or escaped. It refuses unless the tests all pass first; a mutant on a line no test runs is reported as never run without running it; one that loops forever is stopped by counting the module's loop jumps (sys.monitoring JUMP, 100 times the real code's). Before a run, the tab lists what a run would try as Not checked yet (`list_mutants`, made for the code as it is, again after an edit to it). The tab groups them like the site Mutation tab (Escaped, Never run, Not checked yet, Caught), a row goes to its line, its **Run** checks that mutation alone (`only`; the others keep what they said), its **Inject** writes the change into the code to look at or run by hand (the mutant's `after`, the line as changed, only when the change fits on its line and reads back as the same mutant; it is also what the run uses, so line numbers stay true) and **Repair** puts the line back (undo does too; any other edit ends it; a run repairs first), Stop ends the run, and an edit makes the results stale. Results are never stored.
- **Code-mode smells** (the **Smells** tab after Mutation; a profile's `smells(fw)` names them). JS/TS reads them on the page (`code/js/smells.js`, a profile's `smellsOf`, no runtime needed) on tokens and statements: an `it` with no `expect`/`assert`/`fail` (or helper that checks), more than 5, every `it` of a `describe` opening the same way, and a `beforeEach` `x = …` that a test under it (nested describes included) replaces first or never reads; a test calling a function of the file is not counted. Bank account and Cart have a Duplication of Setup there too. Python: the site modes' four smells, found by `smells_of` in `code/python/worker.js` from the test file's syntax tree and shown with the site Smells tab's classes, read again as the tests are typed. Unknown Test: a test with no check of its own (`assert`, an `assert*`/`fail` call, `pytest.raises`/`fail`/`warns`, or a call to a helper in the file that checks). Assertion Roulette: more than 5. Duplication of Setup: every test of a class (or every top-level test function) opens with the same statements, up to the first check. General Fixture: `setUp` sets `self.x` and some test does without it, by setting it again on its first line or by never reading it (nor any `setUp` attribute built from it); a test that calls another method on `self` or uses `self` bare is not counted, nor an attribute `tearDown` or a non-assignment `setUp` line uses. In pytest, a fixture that makes a value and that a test it is given replaces at once or never mentions (one asked for its side effect is fine). Bank account and Cart have a Duplication of Setup in both frameworks, on purpose. Like the site panel it has **This file** and **All smells** (every smell, with the examples that have it in the framework on screen, read again each time the tab opens; a row opens the example at its line).
- **Code-mode Create** (`python-create`, `javascript-create`; a profile's `create`, `skeleton` and `nameOf`): the site Create for unit tests. The tests editor starts as the example's imports (or requires) and each test's name once, as a comment (`skeleton`), kept per example, framework and language apart from Explore's file (`create:` in the edit key). A **Create** tab, first beside Results and only in Create, sorts the names into TODO (no test with that name), DOING and DONE as you type. A test is matched by its name alone (`nameOf`: the method name in Python, whatever class; the `it` title in JS/TS, whatever describe). **Decided:** a name is DONE when your test passes and catches every mutation the example's test with that name catches, because the names do not say which values to try. **Check** runs it (`brief` in both workers): both files on the code, then on each mutation on a line either runs, every test to the end, keeping which names failed; a templated JS title (`turns ${n} into ${expected}`) gathers its cases. The example's tests must pass on the code first. What a check said about a test lasts while that test's own lines (`blockAt`) and the code are unchanged. Python caches what the example's tests catch per code and framework. JS/TS mutations are made on tokens (`code/js/mutate.js`: comparisons, arithmetic and `<`/`>` only with a space on both sides, `&&`/`||`, whole numbers, `true`/`false`, `!` removed, a return as `undefined`; never on import, require or export lines), and the framework is evaluated again for each run. Both workers stop a run that goes on 100 times longer than the code as written (Python's loop jumps, JS's coverage probes counting statements) and start counting again, so only that test fails. Never stored.
- **Code-mode autocomplete** (`code/complete.js`): the tests editor offers the snippets of the language and framework on screen (each profile's `snippets`): a blank test, a group, hooks, imports of the example's own module, and the framework's checks. `code/snippets.js` finds them (`match`) and writes them (`expand`): the first placeholder is selected, and Tab then goes on to the body. It shares its list with the YAML editor's (`suggestlist.js`).
- **JS/TS specifics:** test files are CommonJS in JS and import/export in TS; `code/js/worker.js` gives them a small `require` with an in-memory `fs`, `os` and `path`, plus `chai` and `sinon` under Mocha. TypeScript is transpiled, not type-checked, and stack lines are mapped back through its source map.
- **Adding an example to a code mode** means, for Python, a folder with `<module>.py`, `unittest/test_<module>.py` and `pytest/test_<module>.py` holding the same tests under the same names, all passing, and a row in its group in `examples/code.js` (`[id, teaches]`; the name shown is the id beautified); for JS/TS, the same example in all six files with the same `describe`/`it` names. Both modes keep the same examples in the same order, written alike, so each example's tests take the same branches, catch, miss and never run the same mutations, and have the same smells in both (pinned in `align.spec.js`; lines are not compared). A test count may differ only where a framework counts cases (pytest's `parametrize`, a JS loop of `it`s, against unittest's `subTest`). Pinned in `tests/unit/python.test.mjs` and `javascript.test.mjs`, and run in `python.spec.js` and `javascript.spec.js`.
- The URL hash is the mode, then the example: `#python`, `#python-create`, `#javascript`, `#javascript-create`, `#html`, `#html-create`, then `#<example>` unless it is the mode's first (`#python#stack`, `#html-create#coupon-code`); naming the first works too. **Home is Python on its first example**: `/` and `#python` are both home, and an address that already says what is showing is never rewritten (`says` in `share.js`). **Decided:** no old link shapes are kept: any other hash (`#coupon-code`, `#explore`, `#create`, `#stack`) opens home and becomes `#python`. `read` in `share.js` parses it; `linkedMode` gives the mode. The mode is not remembered across visits: every mode is in the hash, so a reload keeps it, and a bare `/` is always home. `share.js` owns it: `selectSite` *replaces* the hash, and `hashchange` reads both halves before applying either. **Decided:** a hash, not a query (works on GitHub Pages).
- **Reset** (`resetAll` in `main.js`) is global: it clears every Playlive key for every example. Layout, theme and mode survive.

## Features

- **Catalog** (`html/catalog.js`): what the live page offers, read through `targetParts` the same way the recorder does. Harvests only add. Hidden elements are kept.
- **Mutation** (`html/bugs.js`, called "bugs" in code, "Mutation" on screen; don't rename): `{ id, title, find, replace }` patches applied to the page source and served as `srcdoc`. It refuses to start unless the suite is green. Each `find` must match **exactly once**. A site with bugs needs `bugs: true` in the manifest. `hunting` keeps hunt results out of history and status.
- **Create** (`html/create.js`): the editor starts with only the example's test titles as comments. It keeps its own file per site (`createTests`, stored under `:create`); always go through `testsFor`/`stashEditor`. A title is done when a test with that exact title makes every check the original makes in its own steps. Tests with no checks aren't offered. **Decided:** the titles are the whole brief, so a title names every choice its checks depend on (which country, which question). Otherwise a correct test written for another choice never counts.
- **Smells** (`html/smells.js`): reads the file, not a run. Unknown Test (no own check), Assertion Roulette (> `ROULETTE` = 5 checks), Duplication of Setup (every test opens with the same steps), General Fixture (a `beforeEach` `fill`/`select` that a test's first step sets to another value, when nothing later in `beforeEach` could have used it). **Decided:** a smell stays silent when unsure, and one with no line to jump to isn't shown. Five example tests are deliberately smelly, and **Decided:** no comment says so — finding them is the exercise (pinned in `smells.test.mjs`). Adding a smell means an entry in `SMELLS`, a rule in `report`, tests for what it catches and what it must not, and an example that has it.
- **HTML view** (`html/htmlview.js`): live markup, re-read after every step, with the step's line marked and the action name in the gutter. Editable, with no buttons: leaving the editor (or ⌘/Ctrl+Enter) makes it the site's page (`editedHtml`, never stored); undo takes edits back. The bar over it shows only while a mutation is injected.
- **⌘/Ctrl+/ comments or uncomments the selected lines** in every editor (`commentLines` in `editkeys.js`).
- **⌘/Ctrl+Z undoes, ⇧⌘Z or Ctrl+Y redoes** in every editor (`undoable` in `editkeys.js`), because setting a value or `setRangeText` defeats the browser's own undo. A programmatic edit must fire `input` to be a step; a value set without one (a file loaded) starts a new history. Undo fires `input` with `e.undo` set.
- **The test editor refuses paste and drop** (`REFUSED` in `html/editor.js`); copy and cut are allowed. **Decided:** writing the steps is the exercise.
- **Autocomplete** (`html/complete.js`): `context()` reads the caret, `itemsFor()` fills from the catalog. It only offers what the action can act on.
- **Exports:** no comments. Preserve runner semantics: fresh page per test, partial match for `expectText`, visible text only for `expectNoText`, per-step timeouts, `${unique}`. Update both exporters together.

## Storage

Keys (no version suffix): `live-test-runner`, `:create`, `:history`, `:status`, `:site-keys`, `:layout`. Wrap every access in `try/catch` and read defensively. **Never stored:** the catalog, scores, anything about bugs, edited markup, the smells tab.

## Known limits

Same-origin pages only. Clicks and typing are synthetic DOM events (`isTrusted` is false). Uploads, downloads, tabs and native dialogs are out of scope. Exports are syntax-checked, not executed.
