/*
 * Premium Learning My Hub — compose-plan fetch helper.
 *
 * The public backend is unavailable until approved access control and a content contract
 * exist. Do not render fixtures or call the public endpoint while it is closed.
 */

export const SAFE_DEFAULT_PLAN = {
  meta: { mode: 'learn', aiUsed: false },
  layout: {
    blocks: [
      {
        id: 'pl-todays-plan', show: false, order: 0, emphasis: false,
      },
      {
        id: 'pl-cohort-readiness', show: false, order: 0, emphasis: false,
      },
      {
        id: 'pl-my-priorities', show: false, order: 0, emphasis: false,
      },
      {
        id: 'pl-recommended', show: false, order: 0, emphasis: false,
      },
    ],
  },
};

/**
 * Returns a closed layout until the endpoint can be called safely.
 * @returns {Promise<object>} { meta, layout }
 */
export default async function loadPlan() {
  return SAFE_DEFAULT_PLAN;
}
