/* ---------- One icon per category ---------- */
// The published page runs under a CSP that allows no remote images, so these are
// inline SVG like the rest of the app's icons. Each is 24x24 and stroke-only, so
// `svg.i` in the stylesheet does the sizing and takes the colour from
// `currentColor` — which is how a category head tints its icon with its accent.
// This module holds data and nothing else: it runs no code when it is imported.
const PATHS = {
  Shopping: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  Support: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>'
    + '<path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5"/>',
  Accounts: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  Admin: '<path d="M12 3l8 3v6c0 4.4-3.3 7.9-8 9-4.7-1.1-8-4.6-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  Travel: '<path d="M21 3L3 10.5l7 3 3 7L21 3z"/><path d="M10 13.5L21 3"/>',
  Banking: '<path d="M3 10l9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>',
  Search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  Social: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 19v1"/>'
    + '<path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M21 20v-1a4.5 4.5 0 0 0-3.2-4.3"/>',
  Inbox: '<path d="M5.4 5.6L3 13v5.5A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5V13l-2.4-7.4'
    + 'A1.5 1.5 0 0 0 17.2 4.5H6.8a1.5 1.5 0 0 0-1.4 1.1z"/><path d="M3 13h5l1.5 3h5l1.5-3h5"/>',
  Productivity: '<path d="M4 7l1.5 1.5L8.5 5.5"/><path d="M4 16.5L5.5 18 8.5 15"/><path d="M12 7h8M12 17h8"/>',
  Media: '<circle cx="12" cy="12" r="8.5"/><path d="M10.5 9l5 3-5 3V9z"/>',
  Health: '<path d="M12 20.5s-7.5-4.8-7.5-10A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.2-7.5 10-7.5 10z"/>',
  Dashboards: '<path d="M4 20v-9M9.5 20V5M15 20v-6M20.5 20v-9"/><path d="M3 20h18"/>',
  Learning: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5 2.5 9z"/>'
    + '<path d="M6.5 11.3V16c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.7"/>',
  Games: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M9 9h.01M12 12h.01M15 15h.01"/>',
  // The catch-all gets the catch-all icon.
  Misc: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'
};

// A category with no icon of its own falls back to Misc's rather than drawing
// nothing, so a theme added to the manifest alone still looks finished.
export const catIconSvg = cat =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${PATHS[cat] || PATHS.Misc}</svg>`;
