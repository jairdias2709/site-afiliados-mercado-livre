import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_DATA_URL = new URL('../data/products.json', import.meta.url);

export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeProduct(product) {
  if (!product || !product.id) throw new Error('product.id is required');
  return {
    id: product.id,
    slug: product.slug ? slugify(product.slug) : slugify(`${product.title || product.id}`),
    title: product.title || 'Produto',
    category: product.category || 'Moda e Beleza',
    price: product.price ?? null,
    image: product.image || '',
    description: product.description || '',
    // Listing URL on Mercado Livre (without affiliate tag).
    url: product.url || '',
    // Official affiliate link (e.g. meli.la) generated in the ML panel. Preferred over the tag.
    affiliateUrl: product.affiliateUrl || '',
    seller: product.seller || '',
    officialStore: ['sim', 'true', 'yes', '1'].includes(String(product.officialStore ?? '').toLowerCase()),
    rating: Number.isFinite(Number(product.rating)) && product.rating !== null && product.rating !== '' ? Number(product.rating) : null,
    reviews: Number.isFinite(Number(product.reviews)) && product.reviews !== null && product.reviews !== '' ? Number(product.reviews) : null,
  };
}

export async function loadProducts(dataUrl = DEFAULT_DATA_URL) {
  const file = typeof dataUrl === 'string' ? dataUrl : fileURLToPath(dataUrl);
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.products;
  if (!Array.isArray(items)) throw new Error('products.json must contain an array or { products: [] }');
  return items.map(normalizeProduct);
}

export function createCatalog(products) {
  const byId = new Map();
  const bySlug = new Map();
  for (const product of products) {
    byId.set(product.id.toLowerCase(), product);
    bySlug.set(product.slug, product);
  }
  return {
    all: () => products,
    byCategory: (category) =>
      products.filter((p) => p.category.toLowerCase() === String(category).toLowerCase()),
    find: (key) => byId.get(String(key).toLowerCase()) || bySlug.get(slugify(key)) || null,
    categories: () => [...new Set(products.map((p) => p.category))],
    findCategory: (key) => products.find((p) => slugify(p.category) === slugify(key))?.category || null,
    // Same-category products, best rated first (internal linking block).
    related: (product, limit = 4) =>
      products
        .filter((p) => p.id !== product.id && p.category === product.category)
        .sort((a, b) => score(b) - score(a))
        .slice(0, limit),
    // Cross-sell from the other categories ("quem viu este tambem comprou").
    crossSell: (product, limit = 4) =>
      products
        .filter((p) => p.category !== product.category)
        .sort((a, b) => score(b) - score(a))
        .slice(0, limit),
  };
}

function score(p) {
  return (p.rating || 0) * Math.log10((p.reviews || 0) + 10);
}

export async function loadCategoryCopy(dataUrl = new URL('../data/categories.json', import.meta.url)) {
  try {
    const raw = JSON.parse(await readFile(fileURLToPath(dataUrl), 'utf8'));
    return raw.categories || {};
  } catch {
    return {};
  }
}
