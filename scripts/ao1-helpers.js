/*
 * Audience of ONE — shared helpers for the dumb hub blocks.
 *
 * Blocks read ONLY their own slice from window.__ao1 (published by the controller),
 * render it, and set innerHTML='' when the slice is missing. No fetching, no cross-block
 * reads, no layout/order decisions.
 */

/**
 * Returns the data slice for a block id, or undefined if absent.
 * @param {string} id block id, e.g. 'todays-plan'
 * @returns {*} the block's slice, or undefined
 */
export function getSlice(id) {
  // eslint-disable-next-line no-underscore-dangle
  return (window.__ao1 || {})[id];
}

/**
 * Escapes text taken from the API before inserting into HTML.
 * @param {*} value raw value
 * @returns {string} HTML-safe string
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Placeholder deep-link resolver for a learning object.
 * TODO: wire to the real learning-object route (e.g. `/learn/${loId}`) once available.
 * @param {string} loId learning object id
 * @returns {string} link target ('#' placeholder for now)
 */
export function loUrl(loId) {
  return loId ? '#' : '#';
}

/**
 * Clamps a value into the 0–100 progress range.
 * @param {*} value raw percent
 * @returns {number} integer 0–100
 */
export function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}
