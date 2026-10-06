import { escapeHtml, formatPrice } from '../lib/html.js';
import { layout } from './layout.js';

function productCard(product) {
  return `      <article class="card">
        <a class="card-link" href="/produto/${escapeHtml(product.slug)}">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />
          <h3>${escapeHtml(product.title)}</h3>
        </a>
        ${product.price !== null ? `<p class="price">${escapeHtml(formatPrice(product.price))}</p>` : ''}
        <p class="category">${escapeHtml(product.category)}</p>
      </article>`;
}

export function renderHome({ siteName, tagline, products, categories = [] }) {
  const cards = products.map(productCard).join('\n');
  const body = `    <section class="hero">
      <h1>${escapeHtml(siteName)}</h1>
      <p>${escapeHtml(tagline)}</p>
    </section>
    <section class="grid">
${cards}
    </section>`;
  return layout({ title: siteName, siteName, description: tagline, body });
}

export function renderProduct({ siteName, product }) {
  const price = product.price !== null ? `<p class="price">${escapeHtml(formatPrice(product.price))}</p>` : '';
  const body = `    <article class="product">
      <div class="product-media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
      </div>
      <div class="product-info">
        <p class="category">${escapeHtml(product.category)}</p>
        <h1>${escapeHtml(product.title)}</h1>
        ${price}
        <p class="description">${escapeHtml(product.description)}</p>
        <a class="cta" id="buy-button" href="/go/${escapeHtml(product.id)}" rel="nofollow sponsored noopener" target="_blank">
          Ver oferta no Mercado Livre
        </a>
        <p class="disclosure">Link de afiliado. Voce nao paga nada a mais por isso.</p>
      </div>
    </article>`;
  return layout({
    title: `${product.title} | ${siteName}`,
    siteName,
    description: product.description,
    body,
  });
}

export function renderNotFound({ siteName }) {
  const body = `    <section class="hero">
      <h1>Pagina nao encontrada</h1>
      <p>O produto que voce procura nao esta disponivel.</p>
      <p><a class="cta" href="/">Voltar para a pagina inicial</a></p>
    </section>`;
  return layout({ title: `Nao encontrado | ${siteName}`, siteName, body });
}
