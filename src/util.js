export const sleep = ms => new Promise(r => setTimeout(r, ms));
// Text as a person reads it: one space between words, and for norm, case-insensitive
export const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
export const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
