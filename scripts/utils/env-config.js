// Canonical EXL domains that own the shared header/footer modules.
const DEV_EXL_DOMAIN = 'https://experienceleague-dev.adobe.com';
const STAGE_EXL_DOMAIN = 'https://experienceleague-stage.adobe.com';
const PROD_EXL_DOMAIN = 'https://experienceleague.adobe.com';

const envConfig = {
  development: { exlDomain: DEV_EXL_DOMAIN },
  qa: { exlDomain: DEV_EXL_DOMAIN },
  staging: { exlDomain: STAGE_EXL_DOMAIN },
  production: { exlDomain: PROD_EXL_DOMAIN },
};

export default function getEnvConfig(env = null) {
  if (env && envConfig[env]) {
    return envConfig[env];
  }

  const { hostname } = window.location;

  if (hostname.includes('exl-academy-dev') || hostname.includes('localhost')) {
    return envConfig.development;
  }
  if (hostname.includes('exl-academy-qa') || hostname.includes('experienceleague-dev')) {
    return envConfig.qa;
  }
  if (hostname.includes('exl-academy-stage') || hostname.includes('experienceleague-stage')) {
    return envConfig.staging;
  }
  return envConfig.production;
}
