/*
 * Premium Learning My Hub — compose-plan fetch helper.
 *
 * compose-plan returns DECISIONS ONLY (no block content): what to show, in what order,
 * and why. Blocks fetch their own content from ALM. loadPlan() resolves the layout:
 *
 *   - ?plmock=<name> (or ?ao1mock=<name>): load mocks/compose-plan.<name>.mock.json, so
 *     local dev works without a live IMS token. Mock files are { meta, layout } only.
 *   - otherwise: call the live endpoint with the learner's IMS token.
 *
 * Outcomes:
 *   - not signed in / no IMS token / HTTP 401  -> return null  (do NOT render the hub)
 *   - network / parse / other error            -> return SAFE_DEFAULT_PLAN (render normally)
 *   - success (incl. the backend's own 200 safe-default) -> return the parsed { meta, layout }
 */
import { getImsToken } from './pl-alm.js';

const COMPOSE_PLAN_URL = 'https://266146-premiumlearning-dev.adobeioruntime.net/api/v1/web/premium-learning/compose-plan';

/**
 * The backend's safe-default layout (also returned as a 200 when its pipeline fails past
 * auth). Used client-side as the fallback on network/parse errors so the page still renders.
 */
export const SAFE_DEFAULT_PLAN = {
  meta: { mode: 'learn', aiUsed: false },
  layout: {
    blocks: [
      {
        id: 'pl-todays-plan', show: true, order: 1, emphasis: true,
      },
      {
        id: 'pl-cohort-readiness', show: false, order: 0, emphasis: false,
      },
      {
        id: 'pl-my-priorities', show: false, order: 0, emphasis: false,
      },
      {
        id: 'pl-recommended', show: false, order: 0, emphasis: false,
      },
    ],
  },
};

function mockName() {
  try {
    const params = new URLSearchParams(window.location.search);
    // pl-consistent param is primary; ao1mock accepted for backward compatibility.
    return params.get('plmock') || params.get('ao1mock');
  } catch (e) {
    return null;
  }
}

async function loadMock(name) {
  const base = (window.hlx && window.hlx.codeBasePath) || '';
  try {
    const resp = await fetch(`${base}/mocks/compose-plan.${name}.mock.json`);
    if (!resp.ok) throw new Error(`mock ${resp.status}`);
    return await resp.json();
  } catch (e) {
    // Even in dev, degrade to the safe-default rather than blanking the page.
    return SAFE_DEFAULT_PLAN;
  }
}

/**
 * Loads the compose-plan decisions.
 * @returns {Promise<object|null>} { meta, layout }, or null when signed out
 */
export default async function loadPlan() {
  const name = mockName();
  if (name) return loadMock(name);

  const token = getImsToken();
  if (!token) return null; // logged out — controller will not render the hub

  try {
    const resp = await fetch(COMPOSE_PLAN_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status === 401) return null; // token missing/expired — treat as logged out
    if (!resp.ok) throw new Error(`compose-plan ${resp.status}`);
    return await resp.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[pl-hub] compose-plan failed; using safe-default layout', e);
    return SAFE_DEFAULT_PLAN;
  }
}
