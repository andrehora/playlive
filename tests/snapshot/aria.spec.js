// ARIA snapshots of the app's own UI: what a screen reader is told, region by
// region — roles, names and states such as [pressed] and [selected]. They pin
// structure, not behaviour; app.spec and the rest of tests/e2e say what a run does.
//
// Each snapshot covers one region and lists only the children that matter, so
// an unrelated button does not break it. Text that changes run to run (times,
// counts) is matched with a regex.
import { test, expect } from '@playwright/test';
import { openApp, runAll, setMode, setSpeed, setTab } from '../e2e/app.mjs';

test('the header names the mode, the example and its actions', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
    - link "Playlive"
    - group "What to test":
      - button "Unit"
      - button "E2E" [pressed]
    - button "Previous example"
    - button "Login"
    - button "Next example"
    - button "Reset"
    - button "Share"
    - link "Playlive on GitHub"
  `);
});

test('the example picker filters as you type and marks the open one', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await page.click('#siteBtn');
  await page.fill('#siteSearch', 'log');
  await expect(page.locator('#sitePop')).toMatchAriaSnapshot(`
    - searchbox "Search examples": log
    - group "Example sites":
      - text: Accounts
      - button "Login" [pressed]
      - text: Admin
      - button "Confirm dialog"
  `);
});

test('the export dialog offers both frameworks as tabs', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await page.click('#export');
  const dialog = page.getByRole('dialog', { name: 'Export tests' });
  await expect(dialog).toMatchAriaSnapshot(`
    - heading "Export tests" [level=2]
    - button "Close"
    - tablist "Framework":
      - tab "Playwright" [selected]
      - tab "Cypress"
    - text: /import \\{ test, expect \\} from '@playwright\\/test'/
    - button "Copy"
  `);

  await dialog.getByRole('tab', { name: 'Cypress' }).click();
  await expect(dialog).toMatchAriaSnapshot(`
    - tablist "Framework":
      - tab "Playwright"
      - tab "Cypress" [selected]
    - text: /import '@testing-library\\/cypress\\/add-commands'/
  `);
});

test('a passing run says so and times each test', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await setSpeed(page, 'fast');
  await runAll(page);
  await expect(page.locator('.results-panel')).toMatchAriaSnapshot(`
    - heading /What to show All 3 tests passed in \\d+\\.\\ds/ [level=2]:
      - group "What to show":
        - button "Results" [pressed]
        - button "Mutation"
        - button "Smells"
        - button "Create"
    - heading "Wrong password shows an error" [level=3]
    - text: /\\d+\\.\\ds/
    - button "Run only “Wrong password shows an error”"
    - heading "Valid login opens the dashboard" [level=3]
    - text: /\\d+\\.\\ds/
    - button "Run only “Valid login opens the dashboard”"
    - heading "Log out returns to the login form" [level=3]
    - text: /\\d+\\.\\ds/
    - button "Run only “Log out returns to the login form”"
  `);
});

test('expanded steps read as a list, beforeEach steps first', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await setSpeed(page, 'fast');
  await runAll(page);
  await page.getByRole('button', { name: 'Expand steps' }).first().click();
  await expect(page.locator('#results')).toMatchAriaSnapshot(`
    - button "Collapse steps" [expanded]
    - heading "Wrong password shows an error" [level=3]
    - list:
      - listitem "Show the page at this step": /beforeEach.*Type “ana@northwind.test” into field “Email”/
      - listitem "Show the page at this step": /beforeEach.*Type “secret123” into field “Password”/
      - listitem "Show the page at this step": /Type “wrong-password” into field “Password”/
      - listitem "Show the page at this step": /Click button “Log in”/
      - listitem "Show the page at this step": /Expect to see “Wrong email or password.”/
      - listitem "Show the page at this step": /Expect not to see “Welcome back”/
    - button "Expand steps"
    - heading "Valid login opens the dashboard" [level=3]
  `);
});

test('a file that does not parse raises an alert that says how to fix it', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await page.fill('#spec', 'test: Broken\nsteps:\n  - clik: Nope\n');
  await expect(page.locator('.tests-panel')).toMatchAriaSnapshot(`
    - heading "Tests 1 problem" [level=2]
    - textbox "Tests in YAML": "test: Broken steps: - clik: Nope"
    - 'alert "Go to the line"': '/Test 1, step 1: unknown action "clik"\\. Allowed: click, fill, .*/'
    - button "Run tests"
  `);
});

test('the smells tab names the smell, how to fix it and where it is', async ({ page }) => {
  await openApp(page, { site: 'click-counter', tab: 'smells' });
  await expect(page.locator('#smellScore')).not.toHaveText('');
  await expect(page.locator('#smellTab')).toMatchAriaSnapshot(`
    - button "Measure all examples"
    - text: 1 smell in 4 tests
    - button "See smells"
    - text: Unknown Test 1
    - paragraph: Checks nothing. Add an expect.
    - list:
      - listitem:
        - button "Go to Clicks the button a few times"
  `);
});

test('create turns each title into a to-do linked to its line', async ({ page }) => {
  await openApp(page, { site: 'login' });
  await setTab(page, 'create');
  await expect(page.locator('main')).toMatchAriaSnapshot(`
    - main:
      - heading "Tests No tests" [level=2]
      - textbox "Tests in YAML": "# Wrong password shows an error # Valid login opens the dashboard # Log out returns to the login form"
      - alert: /No tests yet\\. Add one/
      - heading "What to show" [level=2]:
        - group "What to show":
          - button "Results"
          - button "Mutation"
          - button "Smells"
          - button "Create" [pressed]
      - text: 0 of 3 done TODO 3
      - list:
        - listitem:
          - button "Go to Wrong password shows an error"
        - listitem:
          - button "Go to Valid login opens the dashboard"
        - listitem:
          - button "Go to Log out returns to the login form"
  `);
});

test('unit mode offers language, framework and its extra tabs', async ({ page }) => {
  await openApp(page);
  await setMode(page, 'python');
  await expect(page.locator('main')).toMatchAriaSnapshot(`
    - main:
      - heading /Tests test_counter\\.py \\d+ tests/ [level=2]
      - group "Language":
        - button "Python" [pressed]
        - button "JavaScript"
        - button "TypeScript"
      - group "Test framework":
        - button "pytest" [pressed]
        - button "unittest"
      - textbox "Tests in Python"
      - button "Run tests"
      - heading "What to show" [level=2]:
        - group "What to show":
          - button "Results" [pressed]
          - button "Output"
          - button "Coverage"
          - button "Mutation"
          - button "Smells"
          - button "Create"
      - heading "Python source counter.py A first example" [level=2]
      - checkbox "Coverage"
      - textbox "Python code under test"
  `);
});
