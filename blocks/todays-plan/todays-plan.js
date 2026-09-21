import {
  getSlice, esc, loUrl, clampPercent,
} from '../../scripts/ao1-helpers.js';

function itemMarkup(item) {
  const hasPct = Number.isFinite(Number(item.progressPercent));
  const action = item.action || 'Start';
  return `
    <li class="plan-item">
      ${item.reason ? `<p class="item-reason">${esc(item.reason)}</p>` : ''}
      <p class="item-title">${esc(item.title)}</p>
      ${hasPct ? `<div class="progress-track"><div class="progress-fill" style="width:${clampPercent(item.progressPercent)}%"></div></div>` : ''}
      <a class="btn" href="${loUrl(item.loId)}">${esc(action)}</a>
    </li>
  `;
}

/**
 * Audience of ONE: today's ordered plan of learning objects.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('todays-plan');
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    block.innerHTML = '';
    return;
  }

  block.innerHTML = `
    <h2 class="hub-heading">Your plan today</h2>
    <ul class="plan-list">${items.map(itemMarkup).join('')}</ul>
  `;
}
