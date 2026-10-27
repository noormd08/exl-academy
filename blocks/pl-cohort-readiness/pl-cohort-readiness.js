import {
  getDecision, almFetchCached, normalizeJsonApi, esc,
} from '../../scripts/pl-alm.js';
import reasonText from '../../scripts/pl-reasons.js';

const ID = 'pl-cohort-readiness';

function localizedName(attrs) {
  const meta = attrs && attrs.localizedMetadata;
  if (Array.isArray(meta) && meta.length) {
    return (meta.find((m) => m.locale && m.locale.startsWith('en')) || meta[0]).name || '';
  }
  return (attrs && attrs.name) || '';
}

/**
 * Premium Learning: readiness for the nearest upcoming enrolled cohort (learningProgram
 * with a future instance session date). Readiness = required sub-LOs completed / total.
 * Source: /learningObjects?include=enrollment,instances. Self-hides if no upcoming cohort.
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  const decision = getDecision(ID);
  if (decision && decision.show === false) {
    block.innerHTML = '';
    block.hidden = true;
    return;
  }

  block.innerHTML = '<div class="pl-skeleton" aria-hidden="true"></div>';

  try {
    const res = await almFetchCached('/learningObjects?include=enrollment,instances');
    const included = new Map();
    (res.included || []).forEach((r) => included.set(`${r.type}:${r.id}`, r));

    // Nearest upcoming enrolled learningProgram with a future instance session date.
    const now = Date.now();
    const candidate = normalizeJsonApi(res)
      .filter((lo) => lo.type === 'learningProgram' && lo.enrolled)
      .map((lo) => {
        const session = (lo.instances || [])
          .map((i) => Date.parse(i.dateStart))
          .filter((t) => Number.isFinite(t) && t > now)
          .sort((a, b) => a - b)[0];
        return session ? { lo, session } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.session - b.session)[0];

    if (!candidate) {
      block.innerHTML = '';
      block.hidden = true;
      return;
    }

    // Prereq checklist from sub-LOs: name + completion (from each sub-LO's enrollment).
    const prereqs = (candidate.lo.subLoIds || []).map((subId) => {
      const sub = included.get(`learningObject:${subId}`);
      if (!sub) return null;
      const rel = sub.relationships || {};
      const enrRef = rel.enrollment && rel.enrollment.data;
      const enr = enrRef ? included.get(`${enrRef.type}:${enrRef.id}`) : null;
      const done = !!(enr && enr.attributes && enr.attributes.state === 'COMPLETED');
      return { name: localizedName(sub.attributes), done };
    }).filter(Boolean);

    const total = prereqs.length;
    const done = prereqs.filter((p) => p.done).length;
    const readiness = total ? Math.round((100 * done) / total) : 0;

    const why = reasonText(decision && decision.reason)
      || reasonText({ code: 'COHORT_PREP', params: { done, total } });

    block.hidden = false;
    block.innerHTML = `
      <h2 class="pl-heading">${esc(candidate.lo.title)}</h2>
      ${why ? `<p class="pl-why">${esc(why)}</p>` : ''}
      <p class="pl-readiness">${readiness}% ready</p>
      ${total ? `<ul class="pl-checklist">${prereqs.map((p) => `
        <li class="pl-check${p.done ? ' is-done' : ''}">
          <span class="pl-check-mark" aria-hidden="true">${p.done ? '✓' : '○'}</span>
          <span>${esc(p.name)}</span>
        </li>`).join('')}</ul>` : ''}`;
  } catch (e) {
    block.innerHTML = '';
    block.hidden = true;
  }
}
