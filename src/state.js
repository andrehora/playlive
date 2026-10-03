// State that more than one module reads. Reading an imported binding always
// gives the current value, but only this module may assign to one, so each of
// these comes with a setter.
export const TIMEOUT = 4000;        // how long a step waits before it fails

export let stepTimeout = TIMEOUT;   // a step can ask for more time with "timeout: 8000"
export let stopRequested = false;
export let running = false;
export let recording = false;
export let previewTimer;
export let currentSite = 'contact-form';   // the site showing on the right
export let editorSite = 'contact-form';    // the site whose tests are in the editor
export let lastEl = null;                  // the element the current step acted on

export const setStepTimeout = v => { stepTimeout = v; };
export const setStopRequested = v => { stopRequested = v; };
export const setRunning = v => { running = v; };
export const setRecording = v => { recording = v; };
export const setPreviewTimer = v => { previewTimer = v; };
export const setCurrentSite = v => { currentSite = v; };
export const setEditorSite = v => { editorSite = v; };
export const setLastEl = v => { lastEl = v; };
