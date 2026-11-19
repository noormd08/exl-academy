/* eslint-env node */
/* global globalThis */
/* eslint no-underscore-dangle: ["error", { "allow": ["__plHub"] }] */
import assert from 'node:assert/strict';
import {
  afterEach, beforeEach, mock, test,
} from 'node:test';
import loadPlan, { SAFE_DEFAULT_PLAN } from '../scripts/pl-plan.js';
import initPlHub from '../scripts/pl-layout.js';
import {
  almFetch, clearAlmCache, inProgressItems,
} from '../scripts/pl-alm.js';
import decorateToday from '../blocks/pl-todays-plan/pl-todays-plan.js';
import decoratePriorities from '../blocks/pl-my-priorities/pl-my-priorities.js';
import decorateRecommended from '../blocks/pl-recommended/pl-recommended.js';
import decorateCohort from '../blocks/pl-cohort-readiness/pl-cohort-readiness.js';

const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
const ids = SAFE_DEFAULT_PLAN.layout.blocks.map(({ id }) => id);
let requestCount;

function fakeHub() {
  const blocks = new Map(ids.map((id) => [`.${id}`, {
    hidden: false, style: {}, dataset: {},
  }]));
  const hub = {
    hidden: false, dataset: {}, querySelector: (selector) => blocks.get(selector),
  };
  return { hub, blocks, root: { querySelector: () => hub } };
}

beforeEach(() => {
  globalThis.window = { location: { search: '' }, hlx: {} };
  clearAlmCache();
  requestCount = 0;
  globalThis.fetch = () => {
    requestCount += 1;
    throw new Error('No network requests are expected while the backend is disabled');
  };
  mock.method(console, 'warn', () => undefined);
});

afterEach(() => {
  mock.restoreAll();
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  clearAlmCache();
});

test('default and legacy demo URLs never load fixture data or call the backend', async () => {
  window.location.search = '?plmock=prepare&ao1mock=continue';
  assert.deepEqual(await loadPlan(), SAFE_DEFAULT_PLAN);
  assert.equal(requestCount, 0);

  const { hub, root, blocks } = fakeHub();
  await initPlHub(root);
  assert.equal(hub.hidden, false);
  assert.equal(hub.dataset.ready, 'true');
  assert.ok(ids.every((id) => blocks.get(`.${id}`).hidden));
  assert.equal(requestCount, 0);
  assert.equal(window.adobeIMS, undefined);
});

test('backend content is unavailable, so blocks self-hide without breaking My Hub', async () => {
  window.__plHub = { decisions: {} };
  const blocks = [{}, {}, {}, {}];
  await decorateToday(blocks[0]);
  await decoratePriorities(blocks[1]);
  await decorateCohort(blocks[2]);
  await decorateRecommended(blocks[3]);

  assert.ok(blocks.every((block) => block.hidden && block.innerHTML === ''));
  await assert.rejects(almFetch('/learningObjects'), /content endpoint is unavailable/);
  assert.equal(requestCount, 0);
});

test('deterministic continuation ordering prefers courses nearer completion', () => {
  const items = [
    { loId: 'course:low', state: 'STARTED', progressPercent: 20 },
    { loId: 'course:high', state: 'STARTED', progressPercent: 80 },
    { loId: 'course:done', state: 'COMPLETED', progressPercent: 100 },
  ];
  assert.deepEqual(inProgressItems(items).map(({ loId }) => loId), [
    'course:high', 'course:low',
  ]);
});
