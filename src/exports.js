import { SITES } from '../examples/examples.js';
import { editorSite } from './state.js';

/* ---------- Export to Playwright: the same tests as code for CI ---------- */
export function toPlaywright(spec){
  const q = s => JSON.stringify(String(s));
  const loc = t => t.role ? `page.getByRole(${q(t.role)}${t.name ? `, { name: ${q(t.name)}, exact: true }` : ''})`
    : t.label ? `page.getByLabel(${q(t.label)}, { exact: true })`
    : t.placeholder ? `page.getByPlaceholder(${q(t.placeholder)}, { exact: true })`
    : `page.getByText(${q(t.text)}).first()`;
  const qv = s => String(s).includes('${unique}') ? '`' + String(s).replace(/[`\\]/g, '\\$&') + '`' : q(s);
  const line = s => {
    const to = s.timeout ? `{ timeout: ${s.timeout} }` : '';
    const opt = s.timeout ? `, ${to}` : '';
    switch (s.action){
      case 'click': return `await ${loc(s.target)}.click(${to});`;
      case 'fill': return `await ${loc(s.target)}.fill(${qv(s.value)}${opt});`;
      case 'select': return `await ${loc(s.target)}.selectOption({ label: ${q(s.value)} }${opt});`;
      case 'check': return `await ${loc(s.target)}.check(${to});`;
      case 'uncheck': return `await ${loc(s.target)}.uncheck(${to});`;
      case 'wait': return `await page.waitForTimeout(${s.ms});`;
      case 'expectText': return `await expect(page.getByText(${q(s.text)}).first()).toBeVisible(${to});`;
      case 'expectNoText': return `await expect(page.getByText(${q(s.text)})).toHaveCount(0${opt});`;
      case 'expectVisible': return `await expect(${loc(s.target)}).toBeVisible(${to});`;
    }
  };
  const site = editorSite;                      // every test belongs to the site the editor is on
  const out = [`import { test, expect } from '@playwright/test';`, ''];
  out.push(`test.describe(${q(SITES[site].name)}, () => {`, `  test.use({ baseURL: ${q('http://' + SITES[site].host)} });`, '');
  spec.tests.forEach(t => {
    out.push(`  test(${q(t.title)}, async ({ page }) => {`);
    if (JSON.stringify(t.steps).includes('${unique}')) out.push('    const unique = Date.now().toString(36);');
    out.push(`    await page.goto('/');`);          // every test starts from a fresh page
    t.steps.forEach(st => out.push('    ' + line(st)));
    out.push('  });', '');
  });
  out.push('});', '');
  return out.join('\n').trimEnd() + '\n';
}

/* ---------- Export to Cypress: same tests, Testing Library queries ---------- */
export function toCypress(spec){
  const q = s => JSON.stringify(String(s));
  const qv = s => String(s).includes('${unique}') ? '`' + String(s).replace(/[`\\]/g, '\\$&') + '`' : q(s);
  const opt = (s, extra) => { const o = [...(extra || [])]; if (s.timeout) o.push(`timeout: ${s.timeout}`); return o.length ? `{ ${o.join(', ')} }` : ''; };
  // Text targets are partial matches in the runner, so they use cy.contains; the rest use Testing Library
  const loc = (t, s) => {
    if (t.role){ const o = opt(s, t.name ? [`name: ${q(t.name)}`] : []); return `cy.findByRole(${q(t.role)}${o ? ', ' + o : ''})`; }
    if (t.label){ const o = opt(s); return `cy.findByLabelText(${q(t.label)}${o ? ', ' + o : ''})`; }
    if (t.placeholder){ const o = opt(s); return `cy.findByPlaceholderText(${q(t.placeholder)}${o ? ', ' + o : ''})`; }
    const o = opt(s); return `cy.contains(${q(t.text)}${o ? ', ' + o : ''})`;
  };
  const line = s => {
    switch (s.action){
      case 'click': return `${loc(s.target, s)}.click();`;
      case 'fill': {
        const v = String(s.value ?? '');
        if (!v) return `${loc(s.target, s)}.clear();`;
        return `${loc(s.target, s)}.clear().type(${qv(v)}${v.includes('{') ? ', { parseSpecialCharSequences: false }' : ''});`;
      }
      case 'select': return `${loc(s.target, s)}.select(${q(s.value)});`;
      case 'check': return `${loc(s.target, s)}.check();`;
      case 'uncheck': return `${loc(s.target, s)}.uncheck();`;
      case 'wait': return `cy.wait(${s.ms});`;
      case 'expectText': { const o = opt(s); return `cy.contains(${q(s.text)}${o ? ', ' + o : ''}).should('be.visible');`; }
      // innerText ignores hidden elements, like the runner does
      case 'expectNoText': return `cy.get('body'${s.timeout ? `, { timeout: ${s.timeout} }` : ''}).invoke('prop', 'innerText').should('not.include', ${q(s.text)});`;
      case 'expectVisible': return `${loc(s.target, s)}.should('be.visible');`;
    }
  };
  const site = editorSite;                      // every test belongs to the site the editor is on
  // Importing the Testing Library commands here keeps the file self-contained (no setup comment needed)
  const out = [`import '@testing-library/cypress/add-commands';`, ''];
  out.push(`describe(${q(SITES[site].name)}, () => {`, `  const BASE = ${q('http://' + SITES[site].host)};`, '');
  spec.tests.forEach(t => {
    out.push(`  it(${q(t.title)}, () => {`);
    if (JSON.stringify(t.steps).includes('${unique}')) out.push('    const unique = Date.now().toString(36);');
    out.push(`    cy.visit(BASE + '/');`);          // every test starts from a fresh page
    t.steps.forEach(st => out.push('    ' + line(st)));
    out.push('  });', '');
  });
  out.push('});', '');
  return out.join('\n').trimEnd() + '\n';
}
