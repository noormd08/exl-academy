import { getSlice, esc, loUrl } from '../../scripts/ao1-helpers.js';

/**
 * Audience of ONE: the next hands-on exercise, or alternatives while the
 * sandbox spins up.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('practice-next');
  if (!data) {
    block.innerHTML = '';
    return;
  }

  if (data.sandboxReady) {
    const mins = Number(data.minutes);
    const minsLabel = Number.isFinite(mins) ? `${mins} min` : '';
    block.innerHTML = `
      <h2 class="hub-heading">Practice next</h2>
      <div class="practice-exercise">
        <p class="item-title">${esc(data.title)}</p>
        ${minsLabel ? `<p class="item-reason">${esc(minsLabel)}</p>` : ''}
        <a class="btn" href="${loUrl(data.loId)}">Open sandbox</a>
      </div>
    `;
    return;
  }

  const alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
  block.innerHTML = `
    <h2 class="hub-heading">Practice next</h2>
    <p class="practice-pending">Your sandbox isn’t ready yet — try one of these in the meantime.</p>
    ${alternatives.length ? `<ul class="practice-alts">${alternatives.map((alt) => `
      <li class="practice-alt">
        <p class="item-title">${esc(alt && alt.title)}</p>
        ${alt && alt.reason ? `<p class="item-reason">${esc(alt.reason)}</p>` : ''}
      </li>`).join('')}</ul>` : ''}
  `;
}
