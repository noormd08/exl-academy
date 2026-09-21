import { getSlice, esc, loUrl } from '../../scripts/ao1-helpers.js';

function cardMarkup(item) {
  const meta = [item.type, item.duration].filter(Boolean).join(' · ');
  return `
    <li class="rec-card">
      <a class="rec-link" href="${loUrl(item.loId)}">
        ${meta ? `<span class="rec-meta">${esc(meta)}</span>` : ''}
        <span class="item-title">${esc(item.title)}</span>
        ${item.reason ? `<span class="item-reason">${esc(item.reason)}</span>` : ''}
      </a>
    </li>
  `;
}

/**
 * Audience of ONE: a row of recommended learning objects (up to ~5).
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('recommended');
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    block.innerHTML = '';
    return;
  }

  block.innerHTML = `
    <h2 class="hub-heading">Recommended for you</h2>
    <ul class="rec-row">${items.slice(0, 5).map(cardMarkup).join('')}</ul>
  `;
}
