import { escapeHtml, formatPrice } from '../lib/html.js';
import { withChannel } from '../lib/channels.js';
import {
  categoryPath,
  estimateInstallments,
  productDescription,
  productJsonLd,
  productPath,
  breadcrumbJsonLd,
  websiteJsonLd,
} from '../lib/seo.js';
import { layout } from './layout.js';

const e = escapeHtml;
const LINK_ATTRS = 'rel="nofollow sponsored noopener" target="_blank"';
const goHref = (p, src, channel) => `/go/${e(p.id)}?src=${e(src)}${channel ? `&ch=${e(channel)}` : ''}`;

const priceHtml = (p, cls = 'price') =>
  p.price !== null ? `<p class="${cls}">${e(formatPrice(p.price))}</p>` : '';

function installmentsHtml(p) {
  const inst = estimateInstallments(p.price);
  return inst
    ? `<p class="installments">ou ate <strong>${inst.count}x de ${e(formatPrice(inst.amount))}</strong> <span class="muted">(parcelamento estimado; confira no Mercado Livre)</span></p>`
    : '';
}

function ratingHtml(p) {
  if (!p.rating) return '';
  const reviews = p.reviews ? ` <span class="muted">(${e(p.reviews.toLocaleString('pt-BR'))} avaliacoes)</span>` : '';
  return `<p class="rating" aria-label="Nota ${e(p.rating.toFixed(1))} de 5"><span class="stars" aria-hidden="true">&#9733;</span> ${e(p.rating.toFixed(1))}${reviews}</p>`;
}

function trustBadges(p) {
  const official = p.officialStore ? '<li class="seal seal-official">Loja oficial</li>' : '';
  return `<ul class="seals">${official}<li class="seal">Compra segura no Mercado Livre</li><li class="seal">Entrega pelo Mercado Livre</li></ul>`;
}

function productCard(product, index, src = 'card', channel = null) {
  const badge = index < 3 && src === 'card' ? '<span class="badge">Mais vendido</span>' : '';
  const official = product.officialStore ? '<span class="badge badge-official">Loja oficial</span>' : '';
  const link = withChannel(productPath(product), channel);
  return `      <article class="card" data-search="${e(`${product.title} ${product.category}`.toLowerCase())}">
        <a class="card-media" href="${link}">
          ${badge || official}
          <img src="${e(product.image)}" alt="${e(product.title)}" loading="lazy" />
        </a>
        <div class="card-body">
          <p class="eyebrow">${e(product.category)}</p>
          <h3><a href="${link}">${e(product.title)}</a></h3>
          ${ratingHtml(product)}
          ${priceHtml(product)}
          <a class="btn-outline" href="${goHref(product, src, channel)}" ${LINK_ATTRS}>Ver no Mercado Livre <span aria-hidden="true">&#8599;</span></a>
        </div>
      </article>`;
}

const grid = (items, src, channel) => `      <div class="grid">
${items.map((p, i) => productCard(p, i, src, channel)).join('\n')}
      </div>`;

export function renderHome({ siteName, tagline, products, categories = [], baseUrl = '', channel = null }) {
  const featured = products[0];
  const feature = featured
    ? `      <aside class="feature">
        <a class="feature-media" href="${withChannel(productPath(featured), channel)}">
          <span class="tag-dark">Oferta do dia</span>
          <img src="${e(featured.image)}" alt="${e(featured.title)}" />
        </a>
        <div class="feature-info">
          <p class="eyebrow">${e(featured.category)}</p>
          <h2>${e(featured.title)}</h2>
          ${ratingHtml(featured)}
          ${priceHtml(featured, 'price price-lg')}
          <a class="btn-primary" href="${goHref(featured, 'home-feature', channel)}" ${LINK_ATTRS}>Comprar no Mercado Livre &#8599;</a>
        </div>
      </aside>`
    : '';
  const catBlocks = categories
    .map((c) => {
      const items = products.filter((p) => p.category === c).slice(0, 5);
      return `      <a class="cat" id="cat-${e(c.toLowerCase())}" href="${withChannel(categoryPath(c), channel)}">
        <h2>${e(c)}</h2><span class="link">Ver todos de ${e(c)} &rarr;</span>
        <p>${items.map((p) => e(p.title.split(' ')[0])).join(' &middot; ')}</p>
      </a>`;
    })
    .join('\n');
  const body = `    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow eyebrow-hot">Curadoria de hoje</p>
        <h1>Achados de moda e beleza que valem cada clique.</h1>
        <p class="lead">A gente garimpa no Mercado Livre, compara e so indica o que compraria. Voce finaliza la, com a seguranca e a entrega de sempre.</p>
        <div class="actions">
          <a class="btn-primary" href="#mais-vendidos">Ver ofertas do dia &rarr;</a>
          <a class="btn-outline" href="#categorias">Categorias</a>
        </div>
      </div>
${feature}
    </section>
    <section class="cats" id="categorias">
${catBlocks}
    </section>
    <section id="mais-vendidos">
      <div class="section-head"><h2>Mais vendidos da semana</h2></div>
${grid(products, 'card', channel)}
    </section>`;
  return layout({
    title: `${siteName} | Ofertas de moda e beleza no Mercado Livre`,
    siteName,
    description: tagline,
    body,
    categories,
    baseUrl,
    path: '/',
    image: featured?.image,
    jsonLd: [websiteJsonLd({ baseUrl, siteName })],
  });
}

export function renderCategory({ siteName, category, copy = {}, products, categories = [], baseUrl = '', channel = null }) {
  const h1 = copy.h1 || `${category} no Mercado Livre`;
  const description =
    copy.description || `Os melhores achados de ${category.toLowerCase()} no Mercado Livre, com boas avaliacoes e compra segura.`;
  const body = `    <nav class="crumbs" aria-label="Breadcrumb"><a href="${withChannel('/', channel)}">Inicio</a> / <span>${e(category)}</span></nav>
    <section class="category-head">
      <h1>${e(h1)}</h1>
      <p class="lead">${e(copy.intro || description)}</p>
    </section>
    <section id="mais-vendidos">
${grid(products, `categoria-${category.toLowerCase()}`, channel)}
    </section>`;
  return layout({
    title: copy.title ? `${copy.title} | ${siteName}` : `${category} | ${siteName}`,
    siteName,
    description,
    body,
    categories,
    baseUrl,
    path: categoryPath(category),
    image: products[0]?.image,
    jsonLd: [
      breadcrumbJsonLd(baseUrl, [
        { name: siteName, path: '/' },
        { name: category, path: categoryPath(category) },
      ]),
    ],
  });
}

export function renderProduct({ siteName, product, related = [], crossSell = [], categories = [], baseUrl = '', channel = null }) {
  const description = productDescription(product);
  const seller = product.seller ? `<p class="seller">Vendido por <strong>${e(product.seller)}</strong></p>` : '';
  const relatedBlock = related.length
    ? `    <section class="related">
      <div class="section-head"><h2>Mais de ${e(product.category)}</h2><a class="link" href="${withChannel(categoryPath(product.category), channel)}">Ver todos &rarr;</a></div>
${grid(related, 'relacionados', channel)}
    </section>`
    : '';
  const crossBlock = crossSell.length
    ? `    <section class="related">
      <div class="section-head"><h2>Quem viu este tambem comprou</h2></div>
${grid(crossSell, 'cross-sell', channel)}
    </section>`
    : '';
  const body = `    <nav class="crumbs" aria-label="Breadcrumb"><a href="${withChannel('/', channel)}">Inicio</a> / <a href="${withChannel(categoryPath(product.category), channel)}">${e(product.category)}</a> / <span>${e(product.title)}</span></nav>
    <article class="product">
      <div class="product-media">
        <img src="${e(product.image)}" alt="${e(product.title)}" />
      </div>
      <div class="product-info">
        <p class="eyebrow">${e(product.category)}</p>
        <h1>${e(product.title)}</h1>
        ${ratingHtml(product)}
        ${priceHtml(product, 'price price-lg')}
        ${installmentsHtml(product)}
        ${seller}
        ${trustBadges(product)}
        <p class="description">${e(product.description || description)}</p>
        <p class="urgency">Preco e estoque podem mudar a qualquer momento. Confira a oferta antes que acabe.</p>
        <a class="btn-primary cta" id="buy-button" href="${goHref(product, 'produto', channel)}" ${LINK_ATTRS}>
          Ver oferta no Mercado Livre &#8599;
        </a>
        <p class="disclosure">Link de afiliado. Voce nao paga nada a mais por isso.</p>
      </div>
    </article>
${relatedBlock}
${crossBlock}
    <div class="sticky-cta">
      <div class="sticky-cta-info">${priceHtml(product, 'price')}<span class="muted">Oferta por tempo limitado</span></div>
      <a class="btn-primary" href="${goHref(product, 'sticky', channel)}" ${LINK_ATTRS}>Comprar no Mercado Livre</a>
    </div>`;
  return layout({
    title: `${product.title} | ${siteName}`,
    siteName,
    description,
    body,
    categories,
    baseUrl,
    path: productPath(product),
    image: product.image,
    ogType: 'product',
    jsonLd: productJsonLd(product, { baseUrl, siteName }),
  });
}

export function renderNotFound({ siteName, baseUrl = '' }) {
  const body = `    <section class="hero hero-simple">
      <div class="hero-text">
        <h1>Pagina nao encontrada</h1>
        <p class="lead">O produto que voce procura nao esta disponivel.</p>
        <p><a class="btn-primary" href="/">Voltar para a pagina inicial</a></p>
      </div>
    </section>`;
  return layout({ title: `Nao encontrado | ${siteName}`, siteName, body, baseUrl, robots: 'noindex, follow' });
}
