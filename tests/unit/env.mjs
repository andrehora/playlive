// The environment Playlive's unit tests run in.
//
// Playlive is buildless and every module imports `dom.js`, which reads the
// page's elements at load time, so a module cannot be imported without a
// document. This builds one out of the real index.html with jsdom, puts it on
// the globals the app expects, and loads js-yaml under the name the CDN script
// gives it. Nothing here fakes a module: what the tests import is the shipped
// source, reading the shipped markup.
//
// Import this file *first*, with `await env()` before any `import` of src/,
// which is why the tests use dynamic import for the modules under test.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import jsyaml from 'js-yaml';

export const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');

const frames = [];
// Run the frame callbacks that have piled up, once each.
export function flushFrames(){
  const due = frames.splice(0, frames.length);
  for (const cb of due) cb(Date.now());
}

let ready;
// One document per process: the modules are singletons, so a second one would
// leave half of them pointing at the first page's elements.
export function env(){
  ready ||= build();
  return ready;
}

async function build(){
  const html = await readFile(resolve(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  // js-yaml is a CDN script in the browser, so the app reads it off the global.
  window.jsyaml = jsyaml;
  globalThis.jsyaml = jsyaml;
  for (const k of ['window', 'document', 'navigator', 'location', 'history', 'localStorage',
    'sessionStorage', 'getComputedStyle', 'matchMedia', 'HTMLElement', 'Element', 'Node',
    'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'DOMParser', 'requestAnimationFrame',
    'cancelAnimationFrame', 'ResizeObserver', 'MutationObserver', 'IntersectionObserver',
    'DragEvent', 'InputEvent', 'FocusEvent', 'PointerEvent', 'Range', 'XMLSerializer']){
    if (window[k] === undefined) continue;
    // `navigator` and friends are getter-only on globalThis in Node.
    Object.defineProperty(globalThis, k, { value: window[k], writable: true, configurable: true });
  }
  // What jsdom does not implement, in the shape the app asks for it.
  // matchMedia: the one query the app makes is prefers-reduced-motion, and
  // "no" is the real default on a machine that has not asked for less.
  if (!window.matchMedia) globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
  if (!window.ResizeObserver){
    globalThis.ResizeObserver = window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  }
  // Frames are queued rather than run. editor.js keeps a standing rAF loop so a
  // programmatic edit is picked up without an event — right in a browser,
  // endless in Node, where nothing ever hides the tab. Queuing them leaves the
  // loop dormant and lets a test that wants a redraw ask for one with
  // flushFrames(); jsdom has no layout, so no test needs one yet.
  globalThis.requestAnimationFrame = window.requestAnimationFrame = cb => frames.push(cb);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = () => {};
  // The app fetches an example's tests and markup from the server it is served
  // from. Here they come off disk, which is the same bytes with no server.
  window.fetch = globalThis.fetch = async url => {
    const rel = String(url).replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '');
    try {
      const text = await readFile(resolve(ROOT, rel), 'utf8');
      return { ok: true, status: 200, text: async () => text };
    } catch {
      return { ok: false, status: 404, text: async () => '' };
    }
  };
  return dom;
}

// A module under test, imported after the document exists.
export async function load(path){
  await env();
  return import(pathToFileURL(resolve(ROOT, path)).href);
}

// Markup in the app's own iframe, which is where every module that reads "the
// page" looks (`doc()` in dom.js). Returns that document, so a test can pick
// the element it means out of it.
//
// jsdom has no layout, so getClientRects is always empty and `visible()` is
// false for everything on it. Nothing here asks whether an element is visible:
// that is a question only a real browser can answer, and the Playwright suite
// is where it is asked.
export async function site(markup){
  const dom = await env();
  const d = dom.window.document.getElementById('app').contentDocument;
  d.body.innerHTML = markup;
  return d;
}

// What the editor holds, for the panels that read the file rather than a run.
export async function spec(text){
  const dom = await env();
  const el = dom.window.document.getElementById('spec');
  el.value = text;
  return el;
}

// Every example's shipped tests, read straight off disk: the corpus the
// exporters, the smells and Create are pinned against.
export async function corpus(){
  const { SITE_IDS, SITES } = await load('examples/html/examples.js');
  const out = [];
  for (const id of SITE_IDS){
    out.push({ id, site: SITES[id], yaml: await readFile(resolve(ROOT, `examples/html/${id}/tests.yaml`), 'utf8') });
  }
  return out;
}
