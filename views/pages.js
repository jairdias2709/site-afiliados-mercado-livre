import { escapeHtml, formatPrice } from '../lib/html.js';
import { layout } from './layout.js';

const priceHtml = (p, cls = 'price') =>
  p.price !== null ? `<p class="${cls}">${escapeHtml(formatPrice(p.price))}</p>` : '';

function productCard(product, index) {
  const badge = index < 3 ? '<span class="badge">Mais vendido</span>' : '';
  return `      <article class="card" data-search="${escapeHtml(`${product.title} ${product.category}`.toLowerCase())}">
        <a class="card-media" href="/produto/${escapeHtml(product.slug)}">
          ${badge}
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />
        </a>
        <div class="card-body">
          <p class="eyebrow">${escapeHtml(product.category)}</p>
          <h3><a href="/produto/${escapeHtml(product.slug)}">${escapeHtml(product.title)}</a></h3>
          ${priceHtml(product)}
          <a class="btn-outline" href="/go/${escapeHtml(product.id)}" rel="nofollow sponsored noopener" target="_blank">Ver no Mercado Livre <span aria-hidden="true">&#8599;</span></a>
        </div>
      </article>`;
}

export function renderHome({ siteName, tagline, products, categories = [] }) {
  const featured = products[0];
  const feature = featured
    ? `      <aside class="feature">
        <a class="feature-media" href="/produto/${escapeHtml(featured.slug)}">
          <span class="tag-dark">Oferta do dia</span>
          <img src="${escapeHtml(featured.image)}" alt="${escapeHtml(featured.title)}" />
        </a>
        <div class="feature-info">
          <p class="eyebrow">${escapeHtml(featured.category)}</p>
          <h2>${escapeHtml(featured.title)}</h2>
          ${priceHtml(featured, 'price price-lg')}
          <a class="btn-primary" href="/go/${escapeHtml(featured.id)}" rel="nofollow sponsored noopener" target="_blank">Comprar no Mercado Livre &#8599;</a>
        </div>
      </aside>`
    : '';
  const catBlocks = categories
    .map((c) => {
      const items = products.filter((p) => p.category === c).slice(0, 5);
      return `      <a class="cat" id="cat-${escapeHtml(c.toLowerCase())}" href="#mais-vendidos">
        <h2>${escapeHtml(c)}</h2><span class="link">Ver tudo &rarr;</span>
        <p>${items.map((p) => escapeHtml(p.title.split(' ')[0])).join(' &middot; ')}</p>
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
      <div class="grid">
${products.map(productCard).join('\n')}
      </div>
    </section>`;
  return layout({ title: siteName, siteName, description: tagline, body, categories });
}

export function renderProduct({ siteName, product }) {
  const body = `    <p class="crumbs"><a href="/">Inicio</a> / ${escapeHtml(product.category)}</p>
    <article class="product">
      <div class="product-media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
      </div>
      <div class="product-info">
        <p class="eyebrow">${escapeHtml(product.category)}</p>
        <h1>${escapeHtml(product.title)}</h1>
        ${priceHtml(product, 'price price-lg')}
        <p class="description">${escapeHtml(product.description)}</p>
        <a class="btn-primary cta" id="buy-button" href="/go/${escapeHtml(product.id)}" rel="nofollow sponsored noopener" target="_blank">
          Ver oferta no Mercado Livre &#8599;
        </a>
        <p class="disclosure">Link de afiliado. Voce nao paga nada a mais por isso.</p>
      </div>
    </article>`;
  return layout({ title: `${product.title} | ${siteName}`, siteName, description: product.description, body, categories: [product.category] });
}

export function renderNotFound({ siteName }) {
  const body = `    <section class="hero hero-simple">
      <div class="hero-text">
        <h1>Pagina nao encontrada</h1>
        <p class="lead">O produto que voce procura nao esta disponivel.</p>
        <p><a class="btn-primary" href="/">Voltar para a pagina inicial</a></p>
      </div>
    </section>`;
  return layout({ title: `Nao encontrado | ${siteName}`, siteName, body });
}
