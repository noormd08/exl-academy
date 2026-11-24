const API = 'http://127.0.0.1:9081/api/mock-for-you';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function request(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The mock backend returned an invalid response.');
  }
  if (!response.ok) throw new Error(data.error || 'The mock backend request failed.');
  return data;
}

const SAFE_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'H2', 'H3', 'H4', 'P']);
const SAFE_CLASSES = new Set([
  'mock-for-you-hero', 'mock-for-you-results-section', 'mock-for-you-courses',
  'mock-for-you-course', 'mock-for-you-label',
]);

function copySafeNode(node) {
  if (node.nodeType === 3) return document.createTextNode(node.textContent);
  if (node.nodeType !== 1 || !SAFE_TAGS.has(node.tagName)) {
    throw new Error('The mock backend returned an unsupported section.');
  }
  const attributes = [...node.attributes];
  if (attributes.some(({ name, value }) => (
    name !== 'class' || value.split(/\s+/).some((item) => !SAFE_CLASSES.has(item))
  ))) throw new Error('The mock backend returned an unsupported section attribute.');
  const result = document.createElement(node.tagName.toLowerCase());
  if (node.hasAttribute('class')) result.className = node.getAttribute('class');
  [...node.childNodes].forEach((child) => result.append(copySafeNode(child)));
  return result;
}

function renderPage(target, events) {
  if (!Array.isArray(events)) throw new Error('The mock backend returned an invalid event response.');
  const sections = events.filter((event) => event?.type === 'section');
  if (!sections.length) throw new Error('The mock backend returned no page sections.');
  const content = document.createDocumentFragment();
  sections.forEach((section, index) => {
    if (section.index !== index || typeof section.html !== 'string') {
      throw new Error('The mock backend returned an invalid section.');
    }
    const template = document.createElement('template');
    template.innerHTML = section.html;
    [...template.content.childNodes].forEach((node) => {
      content.append(copySafeNode(node));
    });
  });
  target.replaceChildren(content);
}

export default function initMockForYou(main) {
  const section = element('div', '', 'section mock-for-you');
  const heading = element('h1', 'For You');
  const intro = element('p', 'Local demo using synthetic learner data. Do not enter sensitive information.');
  const form = element('form', '', 'mock-for-you-form');
  const personaLabel = element('label', 'Demo learner');
  const persona = element('select');
  persona.required = true;
  personaLabel.append(persona);
  const queryLabel = element('label', 'What would you like to learn?');
  const query = element('input');
  query.type = 'search';
  query.maxLength = 500;
  query.placeholder = 'e.g. Explore AEM components';
  queryLabel.append(query);
  const button = element('button', 'Update recommendations');
  button.type = 'submit';
  form.append(personaLabel, queryLabel, button);
  const status = element('p', 'Loading demo personas…', 'mock-for-you-status');
  status.setAttribute('role', 'status');
  const results = element('div', '', 'mock-for-you-results');
  section.append(heading, intro, form, status, results);
  main.replaceChildren(section);

  let generation = 0;
  async function update() {
    generation += 1;
    const current = generation;
    status.textContent = 'Generating your page…';
    results.replaceChildren();
    try {
      const response = await request(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: persona.value, query: query.value }),
      });
      if (current !== generation) return;
      renderPage(results, response);
      status.textContent = 'Synthetic demo recommendations';
    } catch (error) {
      if (current === generation) status.textContent = error.message || 'Unable to load recommendations.';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });
  persona.addEventListener('change', update);
  request(API).then(({ personas }) => {
    personas.forEach(({ id, label }) => {
      const option = element('option', label);
      option.value = id;
      persona.append(option);
    });
    if (!personas.length) throw new Error('No demo personas are available.');
    update();
  }).catch((error) => {
    status.textContent = error.message || 'Could not load demo personas.';
  });
}
