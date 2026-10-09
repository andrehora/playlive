import { SITE_IDS } from '../examples/html/examples.js';

// State that more than one module reads. Reading an imported binding always
// gives the current value, but only this module may assign to one, so each of
// these comes with a setter.
export const TIMEOUT = 4000;        // how long a step waits before it fails

export let stepTimeout = TIMEOUT;   // a step can ask for more time with "timeout: 8000"
export let stopRequested = false;
export let running = false;
export let recording = false;
export let previewTimer;
export let currentSite = SITE_IDS[0];      // the site showing on the right
export let editorSite = SITE_IDS[0];       // the site whose tests are in the editor, the first example unless a link names another
export let lastEl = null;                  // the element the current step acted on
export let completionOpen = false;         // the autocomplete list is showing, so it owns Tab and Enter
export let mode = 'explore';               // which panels the left column has, and which file the editor holds
export const editedHtml = {};              // site -> markup applied in the HTML view, until Reset
export let hunting = false;                // a bug hunt is running the tests against a broken page
export const bugHtml = {};                 // site -> the page with one bug patched in, while it is injected
export const codeExample = {};              // code mode -> the example it is showing, its first until chosen

export const setStepTimeout = v => { stepTimeout = v; };
export const setStopRequested = v => { stopRequested = v; };
export const setRunning = v => { running = v; };
export const setRecording = v => { recording = v; };
export const setPreviewTimer = v => { previewTimer = v; };
export const setCurrentSite = v => { currentSite = v; };
export const setEditorSite = v => { editorSite = v; };
export const setLastEl = v => { lastEl = v; };
export const setCompletionOpen = v => { completionOpen = v; };
// modes.js owns what changing it does; the value lives here because the editor,
// the picker and the sites all have to read it without importing a panel.
export const setAppMode = v => { mode = v; };
export const setHunting = v => { hunting = v; };
export const setCodeExample = (m, id) => { codeExample[m] = id; };
export const setBugHtml = (site, markup) => { bugHtml[site] = markup; };
export const clearBugHtml = site => { delete bugHtml[site]; };
export const setEditedHtml = (site, markup) => { editedHtml[site] = markup; };
export const clearEditedHtml = site => { delete editedHtml[site]; };
