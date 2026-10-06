import process from 'node:process';

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    host: env.HOST || '127.0.0.1',
    siteName: env.SITE_NAME || 'Achados de Moda & Beleza',
    siteTagline:
      env.SITE_TAGLINE ||
      'Selecao de moda e beleza com os melhores achados do Mercado Livre.',
    baseUrl: (env.BASE_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/+$/, ''),
    // Affiliate credential. NEVER hard-code this value; it is injected at runtime
    // from a Paperclip secret (or the operator's env). Empty means "not yet active".
    affiliateTag: env.ML_AFFILIATE_TAG || '',
    affiliateParam: env.ML_AFFILIATE_PARAM || 'matt_word',
    clickHashSalt: env.CLICK_HASH_SALT || 'ml-affiliate-local',
    clicksFile: env.CLICKS_FILE || new URL('./data/clicks.jsonl', import.meta.url).pathname,
    trustProxy: bool(env.TRUST_PROXY, Boolean(env.VERCEL)),
    clickSink: env.CLICK_SINK || (env.VERCEL ? 'stdout' : 'file'),
  };
}

export function affiliateStatus(config) {
  return config.affiliateTag
    ? { active: true, param: config.affiliateParam }
    : { active: false, param: config.affiliateParam };
}
