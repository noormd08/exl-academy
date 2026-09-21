import { getSlice, esc, clampPercent } from '../../scripts/ao1-helpers.js';

// Local code -> label lookup for goal motivations. Unknown codes render nothing.
const WHY_GOAL_LABELS = {
  career: 'Career growth',
  role: 'Role readiness',
  skillgap: 'Close a skill gap',
  certification: 'Certification',
  project: 'Current project',
  manager: 'Manager recommended',
  interest: 'Personal interest',
};

/**
 * Audience of ONE: current goal, progress, level path and motivations.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const data = getSlice('my-goal');
  if (!data || !data.name) {
    block.innerHTML = '';
    return;
  }

  const pct = clampPercent(data.progress);
  const hasLevels = data.currentLevel && data.targetLevel;
  const chips = (Array.isArray(data.whyGoal) ? data.whyGoal : [])
    .map((entry) => WHY_GOAL_LABELS[entry && entry.code])
    .filter(Boolean);

  block.innerHTML = `
    <div class="goal-head">
      <h2 class="hub-heading">${esc(data.name)}</h2>
      <span class="goal-pct">${pct}%</span>
    </div>
    ${hasLevels ? `<p class="goal-levels">
      <span>${esc(data.currentLevel)}</span>
      <span class="goal-arrow" aria-hidden="true">→</span>
      <span>${esc(data.targetLevel)}</span>
    </p>` : ''}
    <div class="goal-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="goal-fill" style="width:${pct}%"></div>
    </div>
    ${chips.length ? `<ul class="goal-chips">${chips
    .map((c) => `<li class="chip">${esc(c)}</li>`).join('')}</ul>` : ''}
  `;
}
