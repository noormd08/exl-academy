/*
 * Premium Learning — shared ALM (Adobe Learning Manager, Prime API v2) access layer.
 *
 * Browser requests for ALM content are disabled. The backend endpoint remains closed until
 * approved access control and a frontend/backend content contract exist.
 */

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
 * Reject content requests while the backend endpoint is unavailable. Blocks catch this and
 * hide only their own content; no ALM credentials or local fixtures are used in the browser.
 * @returns {Promise<object>} never resolves
 */
export async function almFetch() {
  throw new Error('My Hub content endpoint is unavailable');
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

/** Reuse the backend's established continue rule: partial, STARTED, closest to completion first. */
export function inProgressItems(items) {
  return items
    .filter((lo) => lo.state === 'STARTED' && lo.progressPercent > 0 && lo.progressPercent < 100)
    .sort((a, b) => b.progressPercent - a.progressPercent);
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
