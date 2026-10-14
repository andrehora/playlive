# AGENTS.md

**Playlive** teaches testing in the browser.
- **E2E:** YAML tests run live against example sites; export to Playwright and Cypress.
- **Unit:** Python (pytest/unittest) or JS/TS (Jasmine/Mocha) against a small module.
- **Graders:** Mutation, Smells, Create.

Buildless ES modules. Serve with `npm run serve` (http://localhost:4173).

## Checks

```sh
npm install && npx playwright install chromium   # once
npm run test:unit                    # fast, jsdom
npm run test:e2e                     # must be green (includes snapshots)
npm run test:snapshot                # ARIA snapshots only
npm run lint && npm run lint:css     # must be clean
```

- Pure logic → `tests/unit/`. Needs a browser → `tests/e2e/`. Never both.
- ARIA snapshots → `tests/snapshot/`: one region each, inline, only the children that matter, regex for times and counts.
- UI change on purpose → `npm run test:snapshot:update`, then read the diff.
- Unit: import with `await load(...)` (`tests/unit/env.mjs`). No layout; call `flushFrames()` for rAF.
- Layout change → take a screenshot. The desktop page never scrolls.
- New action, exporter rule, smell or example → add a test.

## Layout

```
src/            Shared shell (main, modes, state, share, layout, …)
src/html/       E2E mode
src/code/       Unit modes; python/ and js/ hold each profile and worker
examples/html/  One site per folder + examples.js manifest
examples/python/, examples/javascript/, examples/code.js   Unit examples
tests/          unit/, e2e/, snapshot/, server.mjs
```

A module lives in its mode's folder; shared ones in `src/`. Drop the folder prefix from names.

## Module rules

- Only `main.js` boots. Others never call across modules at load time.
- Shared state in `state.js` (`code/core.js` for unit modes), changed via setters.
- Unimported modules never run.
- Modules talk via `playlive:*` events.
- Tests use `window.playlive`, not module internals.
- No new CDNs, frameworks or build step unless asked.
- Relative paths only (GitHub Pages subfolder). Inline images only (CSP).

## YAML format

```yaml
beforeEach:
  - fill: { label: Email, value: ana@example.test }

test: Shows the dashboard
steps:
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000
```

- Only `beforeEach` and `failOnPageErrors` before the first `test:`.
- Each test starts fresh at `/`. No navigation step.
- Targets: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a string.
- Values and `timeout:` go inside the braces. Default timeout 4s. `${unique}` changes per run.
- Actions: `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectNumber`, `expectVisible`.

**New action:** `ACTIONS` (`html/actions.js`), `normalizeStep` + `ASSERTIONS` (`html/parse.js`), `describeStepBase` (`html/find.js`), `toPlaywright` + `toCypress` (`html/exports.js`), `KINDS` (`html/complete.js`), and one example using it.

**Exports:** no comments; match the runner. Update both together.

## Examples

**E2E site:**
- `examples/html/<id>/index.html` (loads `../hooks.js`, `../site.css`, sets `--accent`).
- `tests.yaml` with 2–5 tests.
- A manifest line in `examples/html/examples.js`.
- Ports, order and accents are pinned in `examples.test.mjs`.
- Plain, accessible HTML: real labels and buttons. Deterministic.
- Each `bugs.js` `find` matches exactly once.
- Categories are one word naming a kind of app, max 16, each with an icon. **Flaky** stays last, the only random site.

**Unit example:**
- Same tests, same names, in every framework (and language for JS/TS), all passing.
- Python and JS/TS stay aligned: same examples, branches, mutations and smells (`align.spec.js`).
- Add a row in `examples/code.js`.
- `upload`, `happy-hour` and `delivery` are flaky on purpose (`{ flaky: true }`).

Some example tests are smelly on purpose, with no comment saying so (`smells.test.mjs`). A smell stays silent when unsure.

## UI

- Colours: grey = running, green = pass, red = fail, yellow = current line, blue = controls only.
- Scores: green 100%, warn from 60%, red below. Never colour alone.
- Every colour three times: light, `prefers-color-scheme: dark`, `[data-theme="dark"]`.
- Use the `:root` size tokens, never literal sizes.
- Copy: sentence case. Errors say how to fix. Tooltips are a few words.
- Accessible: focus rings, labels, ARIA states, keyboard, reduced motion.
- No `scrollIntoView` in the iframe; use `scrollWithinFrame`.
- Hash: mode then example (`#python#stack`). Home is Python.
- Create, Mutation and Smells are Results tabs; Create is last and is a mode.
- No Stop button: Run tests becomes Stop; Esc stops.
- The YAML editor refuses paste and drop. Code editors allow both.
- A hash, not a query; no old link shapes.

## Storage

- Keys: `live-test-runner` and `:create`, `:history`, `:status`, `:site-keys`, `:layout`.
- Always `try/catch`.
- Never store the catalog, scores, mutation results, edited markup or code edits.
- Reset clears all keys except layout, theme and mode.

## Limits

Same-origin only. Synthetic events. No uploads, downloads, tabs or native dialogs. Exports are syntax-checked, not run.
