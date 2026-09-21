import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 * @param {string} [codeBasePath] base path to load fonts.css from; defaults to the current
 *   window.hlx.codeBasePath. Pass this explicitly from call sites that run after the header
 *   block may have swapped codeBasePath to the EXL domain (see loadLazy).
 */
async function loadFonts(codeBasePath = window.hlx.codeBasePath) {
  await loadCSS(`${codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    // Audience of ONE hub: publish plan data and apply layout BEFORE blocks decorate,
    // so each dumb block can read its slice from window.__ao1 during loadSection below.
    if (main.querySelector('.ao1-hub')) {
      const { default: initAo1Hub } = await import('./ao1-layout.js');
      await initAo1Hub(main);
    }
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  // Capture codeBasePath before loading header/footer: the header block temporarily
  // swaps window.hlx.codeBasePath to the EXL domain while the remote header/footer load
  // (restored once the header's 'header-loaded' event fires). All local sections/blocks
  // have already resolved their own asset paths above, so loading header/footer last
  // guarantees nothing local resolves a path during that swap. Use this captured value
  // below rather than window.hlx.codeBasePath, since it may still be swapped at that point.
  const localCodeBasePath = window.hlx.codeBasePath;

  // loadHeader/loadFooter (aem.js) unconditionally append a new block every time they're
  // called — they have no built-in guard against running twice on the same page (e.g. if
  // loadLazy is ever re-entered). Guard here so a second call can never leave two header/
  // footer blocks (and two <exl-header>/<exl-footer> instances) sitting side by side.
  const headerEl = doc.querySelector('header');
  if (headerEl && !headerEl.querySelector(':scope > .block[data-block-name="header"]')) {
    await loadHeader(headerEl);
  }
  const footerEl = doc.querySelector('footer');
  if (footerEl && !footerEl.querySelector(':scope > .block[data-block-name="footer"]')) {
    await loadFooter(footerEl);
  }

  loadCSS(`${localCodeBasePath}/styles/lazy-styles.css`);
  loadFonts(localCodeBasePath);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  // Guard against scripts.js's top-level side effect running more than once against the
  // same document (e.g. if this module is ever evaluated a second time) — without this,
  // loadEager/loadLazy would re-run and build duplicate header/footer blocks.
  if (window.hlx.pageLoaded) return;
  window.hlx.pageLoaded = true;

  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
