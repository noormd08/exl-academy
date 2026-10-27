import {
  getDecision, almFetch, normalizeJsonApi, esc, loUrl,
} from '../../scripts/pl-alm.js';
import reasonText from '../../scripts/pl-reasons.js';

const ID = 'pl-recommended';

function cardMarkup(lo) {
  const meta = [lo.type, lo.durationMinutes ? `${lo.durationMinutes} min` : '']
    .filter(Boolean).join(' · ');
  return `
    <li class="pl-card">
      <a class="pl-card-link" href="${loUrl(lo.loId)}">
        ${meta ? `<span class="pl-card-meta">${esc(meta)}</span>` : ''}
        <span class="pl-card-title">${esc(lo.title)}</span>
      </a>
    </li>`;
}

/**
 * Premium Learning: recommended learning objects (up to 5). Source: GET /recommendations,
 * which can 400/401 on some accounts — any failure self-hides quietly.
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
    const res = await almFetch('/recommendations');
    const items = normalizeJsonApi(res)
      .filter((lo) => lo && lo.loId && lo.title) // guard malformed items
      .slice(0, 5);

    if (!items.length) {
      block.innerHTML = '';
      block.hidden = true;
      return;
    }

    const why = reasonText(decision && decision.reason);
    block.hidden = false;
    block.innerHTML = `
      <h2 class="pl-heading">Recommended for you</h2>
      ${why ? `<p class="pl-why">${esc(why)}</p>` : ''}
      <ul class="pl-cards">${items.map(cardMarkup).join('')}</ul>`;
  } catch (e) {
    block.innerHTML = '';
    block.hidden = true;
  }
}
