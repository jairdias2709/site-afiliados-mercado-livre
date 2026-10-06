import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_DATA_URL = new URL('../data/products.json', import.meta.url);

function slugify(input) {
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
  };
}
