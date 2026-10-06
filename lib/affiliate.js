/**
 * Build a tracking (affiliate) URL for a Mercado Livre listing.
 *
 * The affiliate credential is appended at request time and is never stored in
 * the product data. When the tag is missing the original listing URL is
 * returned unchanged so the link still works during local development.
 */
export function buildAffiliateUrl(rawUrl, { affiliateTag = '', affiliateParam = 'matt_word' } = {}) {
  if (!rawUrl) throw new Error('buildAffiliateUrl: rawUrl is required');
  const url = new URL(rawUrl);
  if (affiliateTag) {
    url.searchParams.set(affiliateParam, affiliateTag);
  }
  return url.toString();
}

export function isLocalhost(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
