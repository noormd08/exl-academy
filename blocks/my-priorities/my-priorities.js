import {
  getSlice, esc, loUrl, clampPercent,
} from '../../scripts/ao1-helpers.js';

const GROUPS = [
  { key: 'now', label: 'Now' },
  { key: 'next', label: 'Next' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
];

function itemMarkup(item) {
  const hasPct = Number.isFinite(Number(item.progressPercent));
  return `
    <li class="priority-item">
      <a class="item-link" href="${loUrl(item.loId)}">
        <span class="item-title">${esc(item.title)}</span>
        ${item.reason ? `<span class="item-reason">${esc(item.reason)}</span>` : ''}
        ${hasPct ? `<span class="progress-track"><span class="progress-fill" style="width:${clampPercent(item.progressPercent)}%"></span></span>` : ''}
      </a>
    </li>
  `;
}

/**
 * Audience of ONE: priority learning objects grouped by urgency.
 * Empty groups are omitted; all-empty renders nothing.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('my-priorities') || {};
  const groups = GROUPS
    .map((g) => ({ label: g.label, items: Array.isArray(data[g.key]) ? data[g.key] : [] }))
    .filter((g) => g.items.length);

  if (!groups.length) {
    block.innerHTML = '';
    return;
  }

  block.innerHTML = `
    <h2 class="hub-heading">My priorities</h2>
    ${groups.map((g) => `
      <section class="priority-group">
        <h3 class="priority-label">${esc(g.label)}</h3>
        <ul class="priority-list">${g.items.map(itemMarkup).join('')}</ul>
      </section>
    `).join('')}
  `;
}
