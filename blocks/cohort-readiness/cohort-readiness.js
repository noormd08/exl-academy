import { getSlice, esc, clampPercent } from '../../scripts/ao1-helpers.js';

/**
 * Audience of ONE: cohort readiness, next session and prerequisite checklist.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('cohort-readiness');
  if (!data || !data.name) {
    block.innerHTML = '';
    return;
  }

  const pct = clampPercent(data.readiness);
  const days = Number(data.startsInDays);
  const daysSuffix = Number.isFinite(days) && days >= 0
    ? ` · in ${days} day${days === 1 ? '' : 's'}`
    : '';
  const prereqs = Array.isArray(data.prerequisites) ? data.prerequisites : [];

  block.innerHTML = `
    <div class="cohort-head">
      <h2 class="hub-heading">${esc(data.name)}</h2>
      ${data.sessionDate ? `<span class="cohort-date">${esc(data.sessionDate)}</span>` : ''}
    </div>
    <p class="cohort-meta">${pct}% ready${esc(daysSuffix)}</p>
    ${prereqs.length ? `<ul class="checklist">${prereqs.map((p) => `
      <li class="checklist-item${p && p.done ? ' is-done' : ''}">
        <span class="checklist-mark" aria-hidden="true">${p && p.done ? '✓' : '○'}</span>
        <span>${esc(p && p.title)}</span>
      </li>`).join('')}</ul>` : ''}
  `;
}
