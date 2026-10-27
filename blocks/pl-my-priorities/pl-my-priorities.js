import {
  getDecision, almFetchCached, normalizeJsonApi, esc, loUrl,
} from '../../scripts/pl-alm.js';
import reasonText from '../../scripts/pl-reasons.js';

const ID = 'pl-my-priorities';

const GROUPS = [
  { key: 'now', label: 'Now' },
  { key: 'next', label: 'Next' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
];

/**
 * Assigns a learning object to exactly one priority bucket (or none).
 * @param {object} lo normalized LO
 * @returns {string|null} bucket key
 */
function bucketOf(lo) {
  const inProgress = lo.state === 'STARTED' && lo.progressPercent > 0 && lo.progressPercent < 100;
  if (inProgress) return 'now'; // Now = in progress
  const futureDue = lo.dueDate && Date.parse(lo.dueDate) > Date.now();
  if (lo.enrolled && futureDue) return 'upcoming'; // Upcoming = future-dated
  if (lo.enrolled && lo.type === 'learningProgram' && lo.state === 'ENROLLED') return 'next'; // cohort prep incomplete
  if (!lo.enrolled) return 'thisWeek'; // skill-adjacent, not enrolled
  return null;
}

function itemMarkup(lo) {
  const hasPct = Number.isFinite(Number(lo.progressPercent));
  const pct = Math.max(0, Math.min(100, Math.round(lo.progressPercent)));
  return `
    <li class="pl-item">
      <a class="pl-item-link" href="${loUrl(lo.loId)}">
        <span class="pl-item-title">${esc(lo.title)}</span>
        ${hasPct ? `<span class="pl-progress"><span class="pl-progress-fill" style="width:${pct}%"></span></span>` : ''}
      </a>
    </li>`;
}

/**
 * Premium Learning: priority learning objects grouped by urgency, derived from the shared
 * /learningObjects?include=enrollment call. Empty groups are omitted.
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
    const res = await almFetchCached('/learningObjects?include=enrollment');
    const los = normalizeJsonApi(res);

    const groups = GROUPS
      .map((g) => ({ label: g.label, items: los.filter((lo) => bucketOf(lo) === g.key) }))
      .filter((g) => g.items.length);

    if (!groups.length) {
      block.innerHTML = '';
      block.hidden = true;
      return;
    }

    const why = reasonText(decision && decision.reason);
    block.hidden = false;
    block.innerHTML = `
      <h2 class="pl-heading">My priorities</h2>
      ${why ? `<p class="pl-why">${esc(why)}</p>` : ''}
      ${groups.map((g) => `
        <section class="pl-group">
          <h3 class="pl-group-label">${esc(g.label)}</h3>
          <ul class="pl-list">${g.items.map(itemMarkup).join('')}</ul>
        </section>`).join('')}`;
  } catch (e) {
    block.innerHTML = '';
    block.hidden = true;
  }
}
