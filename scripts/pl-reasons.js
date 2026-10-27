/*
 * Premium Learning — reason code -> text map.
 *
 * The compose-plan decision may carry a reason { code, params }. Blocks render it as a
 * small "why" label. No fetching. Unknown codes render nothing (return '').
 */

const REASONS = {
  CONTINUE_IN_PROGRESS: () => 'Pick up where you left off',
  COHORT_PREP: (p = {}) => `${p.done ?? 0} of ${p.total ?? 0} prerequisites done`,
  PERSONALIZED_PRIORITIES: () => 'Picked for you',
  BASED_ON_YOUR_SKILLS: () => 'Based on your skills',
};

/**
 * Resolves a decision reason to display text.
 * @param {{code?: string, params?: object}} [reason] the decision's reason
 * @returns {string} label text, or '' for missing/unknown codes
 */
export default function reasonText(reason) {
  if (!reason || !reason.code) return '';
  const fn = REASONS[reason.code];
  return fn ? fn(reason.params || {}) : '';
}
