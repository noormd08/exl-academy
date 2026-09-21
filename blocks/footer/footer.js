import getEnvConfig from '../../scripts/utils/env-config.js';

const envConfig = getEnvConfig();

/**
 * Load and decorate the remote EXL footer
 */
async function loadExlFooter(footer) {
  if (!footer) throw new Error('Footer element not found');

  window.hlx = window.hlx || {};
  const footerModule = await import(`${envConfig.exlDomain}/blocks/footer/footer.js`);

  // Swap codeBasePath so the remote footer's own internal asset resolution points at the
  // EXL domain. Restored by the header block's 'header-loaded' listener once it fires.
  window.hlx.codeBasePath = envConfig.exlDomain;

  if (footerModule?.default) {
    footerModule.default(footer, {
      lang: document.documentElement.lang || 'en',
    });
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  await loadExlFooter(block);
}
