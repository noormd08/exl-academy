/* eslint-env node */
/* global globalThis */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import initMockForYou from '../scripts/mock-for-you.js';

class Element {
  constructor(tag) {
    this.tag = tag;
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.listeners = {};
    this.value = '';
    this.textContent = '';
    this.attributes = [];
    if (tag === 'template') this.content = { childNodes: [] };
  }

  set innerHTML(html) {
    if (html === 'course-template') {
      const section = new Element('section');
      const card = new Element('article');
      const title = new Element('h4');
      title.append({ nodeType: 3, textContent: 'AEM' });
      const progress = new Element('p');
      progress.append({ nodeType: 3, textContent: 'In progress: 40% complete' });
      card.append(title, progress);
      section.append(card);
      this.content.childNodes = [section];
      return;
    }
    const tag = html.startsWith('<script') ? 'script' : 'h2';
    const node = new Element(tag);
    if (tag === 'h2') node.append({ nodeType: 3, textContent: '<script>For you</script>' });
    this.content.childNodes = [node];
  }

  get childNodes() {
    return this.children;
  }

  append(...children) {
    this.children.push(...children);
    if (this.tag === 'select' && !this.value && children[0]) this.value = children[0].value;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.push({ name, value });
  }

  hasAttribute(name) {
    return this.attributes.some((attribute) => attribute.name === name);
  }

  getAttribute(name) {
    return this.attributes.find((attribute) => attribute.name === name)?.value;
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }
}

test('mock page renders section events and regenerates on query', async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    createDocumentFragment: () => new Element('fragment'),
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const data = options.method === 'POST'
      ? [
        {
          type: 'section', index: 0, html: '<h2>&lt;script&gt;For you&lt;/script&gt;</h2>',
        },
        {
          type: 'section',
          index: 1,
          html: 'course-template',
        },
        { type: 'done' },
      ]
      : { personas: [{ id: 'new-learner', label: 'New learner' }] };
    return { ok: true, json: async () => data };
  };
  try {
    const main = new Element('main');
    initMockForYou(main);
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    const section = main.children[0];
    const form = section.children[2];
    const query = form.children[1].children[0];
    const result = section.children[4];
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[1].options.body).personaId, 'new-learner');
    assert.equal(result.children[0].children[0].children[0].textContent, '<script>For you</script>');
    const card = result.children[0].children[1].children[0];
    assert.equal(card.children[0].children[0].textContent, 'AEM');
    assert.equal(card.children[1].children[0].textContent, 'In progress: 40% complete');
    query.value = 'AEM';
    form.listeners.submit({ preventDefault() {} });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.equal(JSON.parse(calls[2].options.body).query, 'AEM');
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});

test('mock page rejects an unsupported HTML section', async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    createDocumentFragment: () => new Element('fragment'),
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  };
  globalThis.fetch = async (url, options) => ({
    ok: true,
    json: async () => (options.method === 'POST'
      ? [{
        type: 'section', index: 0, html: '<script></script>',
      }]
      : { personas: [{ id: 'new-learner', label: 'New learner' }] }),
  });
  try {
    const main = new Element('main');
    initMockForYou(main);
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.match(main.children[0].children[3].textContent, /unsupported section/);
    assert.equal(main.children[0].children[4].children.length, 0);
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
