/*
 * Premium Learning — shared ALM (Adobe Learning Manager, Prime API v2) access layer.
 *
 * Blocks call ALM with the LOGGED-IN LEARNER'S OWN ALM access token, obtained by
 * exchanging their IMS token for an ALM token (IMS -> ALM exchange) in the shell/session
 * layer. The ALM client id / secret / refresh token MUST NEVER reach the browser — only
 * the short-lived learner access token does. If there is no token, callers get an error
 * and render empty; we never fall back to a secret.
 *
 * Mock-first: with USE_MOCK = true the whole hub runs offline against per-call local mock
 * JSON, so the page works with no ALM/IMS at all. Flip USE_MOCK to false to hit real ALM.
 */

// Flip to false to hit the real ALM Prime API v2 with the learner's token.
export const USE_MOCK = true;

const ALM_BASE = 'https://learningmanager.adobe.com/primeapi/v2';

/**
 * Returns the logged-in learner's IMS access token, or '' when signed out.
 *
 * Reuses the shell's existing Adobe IMS library (window.adobeIMS), loaded by the header/
 * shell — this repo does not own IMS plumbing. The standard accessor returns
 * { token, expire, sid }. compose-plan is called with this token (Bearer <IMS token>).
 * @returns {string} IMS bearer token, or '' if unavailable
 */
export function getImsToken() {
  try {
    const at = window.adobeIMS
      && window.adobeIMS.getAccessToken
      && window.adobeIMS.getAccessToken();
    return (at && at.token) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Returns a block's compose-plan decision from window.__plHub.decisions, or undefined.
 * @param {string} id block id, e.g. 'pl-todays-plan'
 * @returns {object|undefined} the decision { id, show, order, emphasis, reason? }
 */
export function getDecision(id) {
  // eslint-disable-next-line no-underscore-dangle
  const hub = window.__plHub || {};
  return (hub.decisions || {})[id];
}

/**
 * Returns the logged-in learner's ALM access token, or '' if unavailable.
 *
 * REAL SOURCE (to wire): the shell exchanges the learner's IMS access token for an ALM
 * access token server-side / via a trusted endpoint (IMS -> ALM token exchange) and
 * exposes only that short-lived token to the page. Replace the stub reads below with the
 * shell's real accessor. Never embed ALM client credentials here.
 * @returns {string} ALM bearer token, or '' when not signed in / not yet exchanged
 */
export function getAlmToken() {
  try {
    // eslint-disable-next-line no-underscore-dangle
    return (window.__almToken)
      || (window.hlx && window.hlx.almToken)
      || '';
  } catch (e) {
    return '';
  }
}

/**
 * Maps an ALM API path (+query) to its local mock file for USE_MOCK mode.
 * @param {string} path e.g. '/learningObjects?include=enrollment'
 * @returns {string} URL of the local mock JSON
 */
function mockUrlFor(path) {
  const base = (window.hlx && window.hlx.codeBasePath) || '';
  const dir = `${base}/mocks/alm`;
  if (path.startsWith('/recommendations')) return `${dir}/recommendations.mock.json`;
  if (path.startsWith('/learningObjects')) {
    const name = path.includes('instances')
      ? 'learningObjects-instances'
      : 'learningObjects-enrollment';
    return `${dir}/${name}.mock.json`;
  }
  return `${dir}/empty.mock.json`;
}

/**
 * GET a path against ALM (or its local mock). Throws on non-200 / missing token so the
 * calling block can catch and render empty.
 * @param {string} path API path beginning with '/', relative to the Prime v2 base
 * @returns {Promise<object>} parsed JSON:API response
 */
export async function almFetch(path) {
  if (USE_MOCK) {
    const resp = await fetch(mockUrlFor(path));
    if (!resp.ok) throw new Error(`ALM mock ${resp.status} for ${path}`);
    return resp.json();
  }

  const token = getAlmToken();
  if (!token) throw new Error('no ALM token');
  const resp = await fetch(`${ALM_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!resp.ok) throw new Error(`ALM ${resp.status} for ${path}`);
  return resp.json();
}

/*
 * Shared in-memory cache. Several blocks need the same
 * GET /learningObjects?include=enrollment — fetch it once, cache the PROMISE, and let
 * every block await the same request. A failed request is evicted so a later block can
 * retry. Keyed by full path so distinct queries don't collide.
 */
const inflight = new Map();

/**
 * Like almFetch, but de-duplicates concurrent/repeat calls to the same path.
 * @param {string} path API path
 * @returns {Promise<object>} shared parsed JSON:API response
 */
export function almFetchCached(path) {
  if (!inflight.has(path)) {
    inflight.set(path, almFetch(path).catch((err) => {
      inflight.delete(path);
      throw err;
    }));
  }
  return inflight.get(path);
}

/** Test/impl helper: clear the shared cache. */
export function clearAlmCache() {
  inflight.clear();
}

/**
 * Normalizes an ALM JSON:API response into flat learning-object records. Enrollment and
 * instance data live in `included` and are joined to each LO by relationship id (they are
 * NOT on the LO's own attributes). Durations are converted from seconds to minutes.
 * @param {object} res JSON:API response ({ data, included })
 * @returns {Array<object>} normalized LOs
 */
export function normalizeJsonApi(res) {
  if (!res || !Array.isArray(res.data)) return [];

  const included = new Map();
  (res.included || []).forEach((r) => included.set(`${r.type}:${r.id}`, r));
  const resolve = (ref) => (ref && ref.id ? included.get(`${ref.type}:${ref.id}`) : undefined);

  const localizedName = (attrs) => {
    const meta = attrs && attrs.localizedMetadata;
    if (Array.isArray(meta) && meta.length) {
      const en = meta.find((m) => m.locale && m.locale.startsWith('en')) || meta[0];
      return en.name || '';
    }
    return (attrs && attrs.name) || '';
  };

  return res.data.map((lo) => {
    const a = lo.attributes || {};
    const rel = lo.relationships || {};

    const enrollment = resolve(rel.enrollment && rel.enrollment.data);
    const ea = enrollment ? (enrollment.attributes || {}) : {};

    const instanceRefs = (rel.instances && rel.instances.data) || [];
    const instances = (Array.isArray(instanceRefs) ? instanceRefs : [instanceRefs])
      .map(resolve)
      .filter(Boolean)
      .map((i) => ({
        id: i.id,
        ...i.attributes,
      }));

    const subLoRefs = (rel.subLOs && rel.subLOs.data) || [];
    const subLoIds = (Array.isArray(subLoRefs) ? subLoRefs : [subLoRefs])
      .filter(Boolean)
      .map((r) => r.id);

    return {
      loId: lo.id,
      type: a.loType || (lo.type || ''),
      title: localizedName(a),
      durationMinutes: Number.isFinite(a.duration) ? Math.round(a.duration / 60) : undefined,
      skillNames: Array.isArray(a.skillNames) ? a.skillNames : [],
      enrolled: !!enrollment,
      state: ea.state, // ENROLLED | STARTED | COMPLETED
      progressPercent: typeof ea.progressPercent === 'number' ? ea.progressPercent : undefined,
      dueDate: ea.dueDate,
      completedRequiredCount: ea.completedRequiredModulesCount,
      instances,
      subLoIds,
    };
  });
}

/**
 * Escapes text taken from ALM before inserting into HTML.
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
 * TODO: return the real ALM learner-app deep link once wired, e.g.
 *   `${LEARNER_APP}/app/learner#/course/${numericId}` (loId is like 'course:12345').
 * @param {string} loId ALM learning object id
 * @returns {string} link target ('#' placeholder for now)
 */
export function loUrl(loId) {
  return loId ? '#' : '#';
}
