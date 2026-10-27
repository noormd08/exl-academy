import {
  getDecision, almFetchCached, normalizeJsonApi, esc, loUrl,
} from '../../scripts/pl-alm.js';
import reasonText from '../../scripts/pl-reasons.js';

const ID = 'pl-todays-plan';

function itemMarkup(item) {
  const pct = Math.max(0, Math.min(100, Math.round(item.progressPercent)));
  return `
    <li class="pl-item">
      <p class="pl-item-title">${esc(item.title)}</p>
      <div class="pl-progress"><div class="pl-progress-fill" style="width:${pct}%"></div></div>
      <a class="pl-btn" href="${loUrl(item.loId)}">Continue</a>
    </li>`;
}

/**
 * Premium Learning: in-progress learning objects to continue today (up to 3).
 * Source: shared /learningObjects?include=enrollment, filtered to STARTED (0<progress<100).
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
    const items = normalizeJsonApi(res)
      .filter((lo) => lo.state === 'STARTED' && lo.progressPercent > 0 && lo.progressPercent < 100)
      .slice(0, 3);

    if (!items.length) {
      block.innerHTML = '';
      block.hidden = true;
      return;
    }

    const why = reasonText(decision && decision.reason);
    block.hidden = false;
    block.innerHTML = `
      <h2 class="pl-heading">Today's plan</h2>
      ${why ? `<p class="pl-why">${esc(why)}</p>` : ''}
      <ul class="pl-list">${items.map(itemMarkup).join('')}</ul>`;
  } catch (e) {
    // Empty data, 401, or any ALM error: self-hide quietly, never throw.
    block.innerHTML = '';
    block.hidden = true;
  }
}
