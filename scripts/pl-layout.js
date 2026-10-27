/*
 * Premium Learning My Hub — layout controller.
 *
 * The compose-plan backend returns DECISIONS ONLY (no content): which blocks to show, in
 * what order, which to emphasize, and an optional reason per block. This controller:
 *   1. loads the plan (see scripts/pl-plan.js: live IMS-authed endpoint, or ?plmock),
 *   2. publishes the decisions on window.__plHub.decisions (blocks read their own — incl.
 *      the reason code, for the "why" label; there is no block content here),
 *   3. applies order/visibility/emphasis to the block elements inside .pl-hub.
 *
 * It NEVER calls ALM and NEVER renders content — each block fetches and renders its own
 * data. Reordering is CSS `order` only (no DOM moves).
 *
 * Signed-out (loadPlan returns null): the hub is not rendered at all.
 */
import loadPlan from './pl-plan.js';

/**
 * Applies compose-plan decisions to the hub. Runs once before blocks decorate.
 * @param {Element|Document} [root] element to search for .pl-hub within
 * @returns {Promise<void>}
 */
export default async function initPlHub(root = document) {
  const hub = root.querySelector('.pl-hub');
  if (!hub) return;

  const plan = await loadPlan();

  // Signed out / no valid IMS token: do not render the hub.
  if (plan === null) {
    hub.hidden = true;
    return;
  }

  const blocks = plan.layout && Array.isArray(plan.layout.blocks) ? plan.layout.blocks : [];

  // Publish decisions BEFORE blocks decorate so each block can read its own (incl. reason).
  // eslint-disable-next-line no-underscore-dangle
  window.__plHub = window.__plHub || {};
  // eslint-disable-next-line no-underscore-dangle
  const store = window.__plHub;
  store.decisions = {};

  blocks.forEach((block) => {
    if (!block || !block.id) return;
    store.decisions[block.id] = block;

    const el = hub.querySelector(`.${block.id}`);
    if (!el) return;

    if (!block.show) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.order = Number(block.order) || 0;
    if (block.emphasis) el.dataset.emphasis = 'true';
    else delete el.dataset.emphasis;
  });

  hub.dataset.ready = 'true';
}
