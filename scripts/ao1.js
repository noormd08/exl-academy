/*
 * Audience of ONE — My Hub fetch layer (MOCK-FIRST).
 *
 * loadPlan() resolves the compose-plan response the hub renders from:
 *   - default:         mocks/compose-plan.mock.json
 *   - ?ao1mock=<name>: mocks/compose-plan.<name>.mock.json   (e.g. ?ao1mock=prepare)
 *   - ?ao1live=1:      the real compose-plan endpoint, with an IMS bearer token
 *
 * On ANY fetch/parse failure it returns a safe default so the page always renders.
 * This module never renders — the controller (ao1-layout.js) and blocks consume it.
 */

// Adobe I/O Runtime host for the live endpoint. Empty = same origin.
// TODO: set this to the real {runtime} base when wiring ?ao1live=1.
const RUNTIME_BASE = '';
const REAL_ENDPOINT = '/api/v1/web/premium-learning/compose-plan';

/**
 * Fresh safe-default plan (new object each call so callers can mutate freely).
 * @returns {object} a minimal, always-renderable compose-plan response
 */
function safeDefault() {
  return {
    meta: { mode: 'learn', aiUsed: false },
    layout: {
      blocks: [{
        id: 'todays-plan',
        show: true,
        order: 1,
        emphasis: true,
      }],
    },
    blocksData: { 'todays-plan': { items: [] } },
  };
}

function mockUrl(name) {
  const base = (window.hlx && window.hlx.codeBasePath) || '';
  return name
    ? `${base}/mocks/compose-plan.${name}.mock.json`
    : `${base}/mocks/compose-plan.mock.json`;
}

async function fetchJson(url, options) {
  const resp = await fetch(url, options);
  if (!resp.ok) throw new Error(`compose-plan request failed: ${resp.status}`);
  return resp.json();
}

/**
 * Best-effort IMS access token for live mode.
 * TODO: wire to this app's real session/IMS (see scripts/utils/session.js) once it exists.
 * @returns {string} bearer token, or '' if unavailable
 */
function getImsToken() {
  try {
    return (window.adobeIMS
      && window.adobeIMS.getAccessToken
      && window.adobeIMS.getAccessToken()
      && window.adobeIMS.getAccessToken().token) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Loads the compose-plan response (mock-first, live opt-in).
 * @returns {Promise<object>} the plan; a safe default on any failure
 */
export default async function loadPlan() {
  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get('ao1live') === '1') {
      const token = getImsToken();
      return await fetchJson(`${RUNTIME_BASE}${REAL_ENDPOINT}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
    return await fetchJson(mockUrl(params.get('ao1mock')));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ao1] loadPlan fell back to safe default', e);
    return safeDefault();
  }
}
