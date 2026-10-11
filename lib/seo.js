import { slugify } from './products.js';

export const productPath = (p) => `/produto/${p.slug}`;
export const categoryPath = (category) => `/categoria/${slugify(category)}`;

export function renderRobots({ baseUrl }) {
  return `User-agent: *\nAllow: /\nDisallow: /go/\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

const xmlEscape = (v) =>
  String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function renderSitemap({ baseUrl, products, categories, lastmod }) {
  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0' },
    ...categories.map((c) => ({ loc: `${baseUrl}${categoryPath(c)}`, priority: '0.8' })),
    ...products.map((p) => ({ loc: `${baseUrl}${productPath(p)}`, priority: '0.6' })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc><lastmod>${lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function productDescription(p) {
  if (p.description) return truncate(p.description, 160);
  const parts = [`${p.title} em oferta no Mercado Livre`];
  if (p.rating) parts.push(`nota ${p.rating.toFixed(1)}${p.reviews ? ` com ${p.reviews.toLocaleString('pt-BR')} avaliacoes` : ''}`);
  if (p.officialStore) parts.push('loja oficial');
  return truncate(`${parts.join(', ')}. Compare o preco e compre com seguranca.`, 160);
}

function truncate(text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function productJsonLd(p, { baseUrl, siteName }) {
  const offer = {
    '@type': 'Offer',
    url: `${baseUrl}${productPath(p)}`,
    priceCurrency: 'BRL',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  };
  if (p.price !== null) offer.price = Number(p.price).toFixed(2);
  if (p.seller) offer.seller = { '@type': 'Organization', name: p.seller };
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    sku: p.id,
    productID: p.id,
    category: p.category,
    description: productDescription(p),
    url: `${baseUrl}${productPath(p)}`,
    offers: offer,
  };
  if (p.image) product.image = [p.image];
  if (p.rating && p.reviews) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return [product, breadcrumbJsonLd(baseUrl, [
    { name: siteName, path: '/' },
    { name: p.category, path: categoryPath(p.category) },
    { name: p.title, path: productPath(p) },
  ])];
}

export function breadcrumbJsonLd(baseUrl, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${baseUrl}${it.path}`,
    })),
  };
}

export function websiteJsonLd({ baseUrl, siteName }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: `${baseUrl}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Estimated installments (sem juros) shown as a conversion hint; the real
// conditions are always the ones shown on the Mercado Livre listing.
export function estimateInstallments(price, { max = 10, minInstallment = 10 } = {}) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  const count = Math.min(max, Math.floor(value / minInstallment));
  if (count < 2) return null;
  return { count, amount: Math.round((value / count) * 100) / 100 };
}

// JSON safe to embed inside <script type="application/ld+json">.
export const jsonLdScript = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
