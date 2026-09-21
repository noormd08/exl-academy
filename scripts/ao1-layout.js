/*
 * Audience of ONE — My Hub layout controller.
 *
 * Runs once on the My Hub page (bootstrapped from scripts.js when a `.ao1-hub`
 * section is present). It:
 *   1. loads the compose-plan response (see scripts/ao1.js),
 *   2. publishes the per-block data on window.__ao1 BEFORE the blocks decorate,
 *   3. applies the backend-decided layout to the block elements inside `.ao1-hub`.
 *
 * The layout is applied GENERICALLY — no hardcoded block ids:
 *   - show:false -> hide (display:none)
 *   - show:true  -> el.style.order = order; toggle `.is-emphasis` from emphasis
 *
 * Blocks never fetch and never decide their own placement. Adding or removing a
 * block from the hub requires ZERO changes to this file.
 *
 * Swap the data source by URL (see scripts/ao1.js):
 *   ?ao1mock=prepare   ?ao1mock=learn   ?ao1live=1
 */
import loadPlan from './ao1.js';

/**
 * Initialises the hub: load plan, publish data, apply layout.
 * @param {Element|Document} [root] element to search for `.ao1-hub` within
 * @returns {Promise<void>}
 */
export default async function initAo1Hub(root = document) {
  const hub = root.querySelector('.ao1-hub');
  if (!hub) return;

  const plan = await loadPlan();

  // Publish data before blocks decorate so each block can read its own slice.
  // eslint-disable-next-line no-underscore-dangle
  window.__ao1 = (plan && plan.blocksData) || {};

  const blocks = plan && plan.layout && Array.isArray(plan.layout.blocks)
    ? plan.layout.blocks
    : [];

  blocks.forEach((entry) => {
    if (!entry || !entry.id) return;
    const el = hub.querySelector(`.${entry.id}`);
    if (!el) return;

    if (!entry.show) {
      el.style.display = 'none';
      return;
    }

    el.style.display = '';
    el.style.order = Number(entry.order) || 0;
    el.classList.toggle('is-emphasis', !!entry.emphasis);
  });
}
