# AGENTS.md

Guidance for AI coding agents (Copilot, Claude Code, Codex, Cursor and others) working on **Playlive**.

## What Playlive is

Playlive runs end-to-end tests live in the browser. You write tests in a small YAML format (by hand, with an LLM, or by recording), pick a site, press **Run all**, and watch every step happen in the site panel while the results update. Tests can be exported to Playwright, Cypress and Selenium for CI.

Everything runs client-side. The runner controls the site under test through a same-origin iframe, so there is no server, browser extension or install.

## Repository layout

```
index.html   The whole app: UI, styles, runner, editor, exporters and the 50 example sites
AGENTS.md    This file
README.md    For humans
```

`index.html` is intentionally a single self-contained file. Do not split it unless the task asks for that. If you do split it, keep it buildless (plain ES modules), keep the example sites in their own file, and update this document.

### External dependencies

Only two, both loaded at runtime:

- **js-yaml 4.1.0** from cdnjs (required, parses the tests). The page exposes it as the global `jsyaml`.
- **IBM Plex Sans and Mono** from Google Fonts (optional, with system fallbacks).

Do not add other CDNs, frameworks or a build step without being asked. The published version runs under a content-security policy that only allows scripts from cdnjs, jsDelivr, the Tailwind CDN and code.jquery.com, styles from Google Fonts, and **no remote images**. That is why the Devicon logos are inlined as SVG.

## Running and checking your work

Serve the folder from `localhost` (VS Code **Live Server**, or `npx serve .`) rather than opening the file directly. The clipboard (the **Copy** button) needs a secure context.

Before finishing any change:

1. **Run all 50 examples.** Every site's example tests must pass, except **Flaky app**, which fails some of the time on purpose. Use a headless browser script (Playwright works well) that, for each id in `SITE_IDS`, calls `selectSite(id)`, clicks `#run`, waits for `#run` to be enabled again, and reads `#summary`. Set `#speed` to `fast` to keep it quick.
2. **Watch for page errors** (`pageerror` events) in light mode, dark mode and a 390px-wide phone viewport.
3. **If you touched an exporter**, generate the export for every example and check the output is valid JavaScript (`node --check`).
4. **If you touched layout**, take screenshots and look at them. The desktop page must never scroll; panels scroll inside themselves.

## The YAML test format

```yaml
site: login                 # which example site the file belongs to
vars:                       # optional, used as ${name}; ${unique} is new on every run
  email: ana@example.test
flows:                      # optional, reusable step lists: "- use: login"
  login:
    - fill: { label: Email }
      value: ${email}
beforeEach:                 # optional, runs at the start of every test
  - use: login

test: Shows the dashboard   # every test starts with "test:" at column 0
vars: { email: other@example.test }   # optional per-test override
steps:
  - click: { role: button, name: Log in }
  - expectText: Welcome back
    timeout: 8000           # optional per-step wait, in ms
```

Rules agents must preserve:

- Tests are written **directly** as top-level `test:` blocks. There is no `tests:` list in new content. Old files with a `tests:` list still parse, for backward compatibility.
- Use `test:` for titles, never `name:`.
- Each test starts from a fresh page at `/`. Tests must not depend on each other.
- Settings allowed before the first test: `site`, `vars`, `flows`, `beforeEach`, `failOnPageErrors`.
- Targets describe elements the way a user sees them: `{ role, name }`, `{ label }`, `{ placeholder }`, `{ text }`, or a plain string as shorthand for `{ text }`.

### Actions

`goto`, `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `expectText`, `expectNoText`, `expectVisible`, plus `use` for flows. Every step waits up to 4 seconds (`TIMEOUT`) unless it sets `timeout:`.

To add an action, update **all** of these:

1. `ACTIONS` (behavior inside the iframe)
2. `normalizeStep` (validation and the normalized shape)
3. `describeStepBase` (the sentence shown in Results)
4. `toPlaywright`, `toCypress` and `toSelenium` (exports)
5. One example site that uses it

## How the code is organized

`index.html` is divided by section comments of the form `/* ---------- Name ---------- */`. Search for them to navigate. The main ones:

| Section | What it does |
|---|---|
| Example sites | `page()` wraps each site's HTML; `SITES` holds all 50 |
| Finding elements | `roleOf`, `query`, `find`, the role/label/text matching |
| Helpful failures | `hintFor`, `closestText`: the "Did you mean…?" hints |
| Parsing | `validate`, `parseTest`, `expandSteps`, `substitute`, `normalizeStep` |
| Running | `runTest`, `run`, step-by-step mode (`waitNext`, `releaseNext`) |
| Time travel | `captureSnapshot`, `showSnapshot`: the page after every step |
| Recorder | turns clicks and typing in the site into YAML steps |
| Exports | `toPlaywright`, `toCypress`, `toSelenium` (+ `SELENIUM_HELPERS`) |
| Site picker | grouped, searchable list of the 50 examples |
| Editor | `hlLine` highlighting, `errorLinesFor`, `lineForStep` |
| Layout | resizable panels, screen-size preview, remembered settings |

Two small scripts are injected at the top of every site page in `loadApp`: `ERROR_HOOK` collects uncaught errors and `console.error` calls, and `STORAGE_HOOK` records which storage keys each site writes, so **Reset** can clear them.

### Browser storage keys

| Key | Holds |
|---|---|
| `live-test-runner:v4` | Each site's test file |
| `live-test-runner:history:v1` | Pass/fail history per test (keyed by site, title and steps) |
| `live-test-runner:status:v1` | Last result per site (the ✓ / ✕ in the picker) |
| `live-test-runner:site-keys:v1` | Storage keys written by each example site |
| `live-test-runner:layout:v1` | Panel sizes, screen size, export tab, Highlight run |

Wrap every storage access in `try/catch`. Bump the version suffix if you change a key's shape.

## Adding an example site

Each entry in `SITES` looks like this:

```js
'coupon-code': {
  name: 'Coupon code', category: 'Shopping', host: 'localhost:3019', accent: '#b45309',
  html: page('#b45309', `BODY HTML`, `SITE SCRIPT`),
  example: `YAML`
},
```

- **Order matters.** Sites are grouped by category in the order of `SITES`. Ports run from 3001 to 3050 in that order.
- **Categories and colors:** Forms `#0f766e`, Accounts `#1d4ed8`, Shopping `#b45309`, Productivity `#7c3aed`, Navigation & content `#be185d`, Calculators & data `#0e7490`, States & feedback `#4d7c0f`. The accent goes in both `accent` and `page(...)`.
- **Inside the body and script,** which live in template literals: no backticks, no `${`, no backslashes. Build strings with `+`. Inside the site's script, `$(id)` is `document.getElementById`.
- **In `example`,** write variables as `\${name}` so the template literal keeps them.
- **Make it testable the way a person would describe it:** real `<label for>` labels, real buttons, and an `aria-label` when several buttons share the same text (for example "Add Coffee beans to cart").
- **Use realistic, deterministic behavior.** Only **Flaky app** may be random or slow on purpose.
- **Write 2 to 4 tests** covering the main path and its error cases, and show off at least one feature where it fits (flows, vars, `beforeEach`, a role like `tab` or `option`).
- **Use descriptive names.** Name the site by what it demonstrates ("Coupon code", not "Acme"), and give it an id in kebab-case.
- **Check the result.** Run the new site's tests and confirm they pass at both Normal and Fast speed.

## UI conventions

- **Colors carry meaning.** Yellow (`--running`) is in progress, green (`--pass`) is passed, red (`--fail`) is failed. Blue (`--run`) is for interactive controls only. Never show progress in blue.
- **Theming.** Every color is a CSS variable defined three times: light, `prefers-color-scheme: dark`, and `[data-theme="dark"]`. Add new tokens to all three.
- **Layout.** On desktop the page fits the window exactly and never scrolls; the editor, results and site panels scroll inside. Never call `scrollIntoView` on anything inside the iframe, because it scrolls the outer page. Use `scrollWithinFrame` and `followInResults`.
- **Results.** Tests are folded by default. Folds the user opens stay open across runs and edits (`expandedTests`).
- **Toolbar order:** Run all, Stop, Record. In Step by step mode, **Run all** turns into **Next step**. There is no separate Next button.
- **Copy.** Use sentence case, plain verbs and specific error messages that say how to fix the problem. Buttons say what they do.
- **Accessibility.** Keep visible focus rings, real buttons with labels, `aria-pressed` and `aria-expanded` where relevant, keyboard support in the picker and dialog, and respect `prefers-reduced-motion`.

## Exports

- Exported code has **no comments**. Keep it that way.
- Playwright uses `getByRole`, `getByLabel`, `getByPlaceholder` and `getByText`. Cypress uses Testing Library queries and imports `@testing-library/cypress/add-commands` at the top. Selenium is JavaScript (`selenium-webdriver` with Mocha) and uses the `byRole`, `byLabel`, `byPlaceholder` and `byText` helpers in `SELENIUM_HELPERS`.
- All three must keep the runner's meaning: fresh page per test, partial text matching for `expectText`, visible text only for `expectNoText`, per-step timeouts and `${unique}`.
- When you change matching rules in the runner, update the exporters to match.

## Removed features: do not bring them back unless asked

- Auto-run on edit
- Prompt for LLM
- Copy report
- The address (URL) field above the site
- The tagline in the top bar
- Keyboard shortcut labels on buttons (the shortcut lives in the tooltip)

## Known limits

- The runner only works with same-origin pages. Testing other local sites needs a reverse proxy that serves them from the same origin, or a small script added to each site that talks to Playlive through `postMessage`.
- Clicks and typing are simulated with DOM events (`isTrusted` is false). File uploads, downloads, multiple tabs and native dialogs are out of scope.
- Exports are generated and syntax-checked, but each framework should still be run once against a real server before relying on it.
