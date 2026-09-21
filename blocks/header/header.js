import getEnvConfig from '../../scripts/utils/env-config.js';
import { isUserSignedIn, onSignOut } from '../../scripts/utils/session.js';

const envConfig = getEnvConfig();

function ensureMeta(name, content) {
  let meta = document.head.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
}

/* exl-header encapsulates nav/search in shadow DOM; document-level header.css does not apply
 * inside it. Load this block's header.css into the shadow root so local overrides reach it. */
function attachLocalHeaderCss(exlHeader) {
  const root = exlHeader?.shadowRoot;
  if (!root || root.querySelector('link[data-local-header-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./header.css', import.meta.url).href;
  link.setAttribute('data-local-header-css', 'true');
  root.appendChild(link);
}

/**
 * Load and decorate the remote EXL header
 */
async function loadExlHeader(header) {
  if (!header) throw new Error('Header element not found');

  window.hlx = window.hlx || {};
  window.exlRootDomain = envConfig.exlDomain;
  const navLinkOrigin = window.exlRootDomain;
  const lang = document.documentElement.lang || 'en';
  ensureMeta('header-fragment', `/${lang}/global-fragments/header`);
  const khorosProfileUrl = `${envConfig.exlDomain}/api/action/khoros/profile-menu-list?platform=gainsight`;

  const headerModule = await import(`${envConfig.exlDomain}/blocks/header/header.js`);

  // Swap codeBasePath so the remote header's own internal asset/block resolution
  // (nav items, search, etc.) points at the EXL domain instead of this app's domain.
  const localCodeBasePath = window.hlx.codeBasePath || '';
  window.hlx.codeBasePath = navLinkOrigin;

  await headerModule.default(header, {
    isUserSignedIn,
    khorosProfileUrl,
    lang,
    navLinkOrigin,
    onSignOut,
  });

  const exlHeader = header.querySelector('exl-header');
  if (!exlHeader) {
    // No shadow-DOM element to wait on — restore now rather than leaving codeBasePath swapped.
    window.hlx.codeBasePath = localCodeBasePath;
    return;
  }

  attachLocalHeaderCss(exlHeader);
  exlHeader.addEventListener(
    'header-loaded',
    () => {
      window.hlx.codeBasePath = localCodeBasePath;
      attachLocalHeaderCss(exlHeader);
    },
    { once: true },
  );
}

/**
 * loads and decorates the block
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  await loadExlHeader(block);
}
