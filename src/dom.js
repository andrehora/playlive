// Every element the app talks to, and the speed setting that paces a run.
export const $id = id => document.getElementById(id);

export const frame = $id('app'), specEl = $id('spec'), resultsEl = $id('results'),
  errorEl = $id('error'), summaryEl = $id('summary');
export const runBtn = $id('run'), stopBtn = $id('stop'), recordBtn = $id('record'), resetBtn = $id('reset'), reloadBtn = $id('reload');
export const tabsEl = $id('tabs'), recBar = $id('recbar');

export const doc = () => frame.contentDocument;

export const SPEEDS = { slow:{step:800,type:110}, normal:{step:350,type:45}, fast:{step:40,type:0}, step:{step:0,type:45} };
export const speedMode = () => $id('speed').value;
export const speed = () => SPEEDS[speedMode()];

export const KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
