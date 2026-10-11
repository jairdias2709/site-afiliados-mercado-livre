import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../lib/app.js';
import { loadConfig } from '../lib/config.js';
import { loadProducts, createCatalog } from '../lib/products.js';
import { createClickStore } from '../lib/tracker.js';
import { buildAffiliateUrl } from '../lib/affiliate.js';

const config = loadConfig({
  ML_AFFILIATE_TAG: 'TEST_TAG_123',
  CLICK_HASH_SALT: 'test-salt',
  BASE_URL: 'http://localhost',
});

let server;
let baseUrl;
const clickStore = createClickStore({ file: null, salt: config.clickHashSalt });

before(async () => {
  const products = await loadProducts();
  const catalog = createCatalog(products);
  server = createApp({ config, catalog, clickStore });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('buildAffiliateUrl appends the affiliate tag and preserves existing query', () => {
  const result = buildAffiliateUrl('https://produto.mercadolivre.com.br/MLB-1?foo=bar', {
    affiliateTag: 'TAG',
    affiliateParam: 'matt_word',
  });
  const url = new URL(result);
  assert.equal(url.searchParams.get('foo'), 'bar');
  assert.equal(url.searchParams.get('matt_word'), 'TAG');
});

test('buildAffiliateUrl returns clean URL when tag is missing', () => {
  const result = buildAffiliateUrl('https://produto.mercadolivre.com.br/MLB-1', { affiliateTag: '' });
  assert.equal(result, 'https://produto.mercadolivre.com.br/MLB-1');
});

let products = [];

test('catalog has the 30 real MLB products (15 Moda + 15 Beleza)', async () => {
  products = await loadProducts();
  assert.equal(products.length, 30);
  assert.equal(products.filter((p) => p.category === 'Moda').length, 15);
  assert.equal(products.filter((p) => p.category === 'Beleza').length, 15);
  assert.equal(new Set(products.map((p) => p.slug)).size, 30);
  for (const p of products) {
    assert.match(p.id, /^MLB\d+$/);
    assert.equal(typeof p.price, 'number');
    assert.ok(!/matt_|tool=|affiliate/i.test(p.url), `url must be raw: ${p.url}`);
  }
});

test('home page renders all products', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  for (const p of products) assert.ok(html.includes(`href="/go/${p.id}?src=`) || html.includes(`/produto/${p.slug}`), p.id);
  assert.match(html, /<\/html>/);
});

test('every product page renders title, image and affiliate CTA', async () => {
  for (const p of products) {
    const res = await fetch(`${baseUrl}/produto/${p.slug}`);
    assert.equal(res.status, 200, p.slug);
    const html = await res.text();
    assert.ok(html.includes(p.image), p.id);
    assert.ok(html.includes(`href="/go/${p.id}?src=produto"`), p.id);
    assert.match(html, /rel="nofollow sponsored noopener"/);
  }
});

test('every /go/:id redirects to its manual affiliate link (meli.la)', async () => {
  for (const p of products) {
    assert.ok(p.affiliateUrl, `${p.id} has affiliateUrl`);
    const res = await fetch(`${baseUrl}/go/${p.id}`, { redirect: 'manual' });
    assert.equal(res.status, 302, p.id);
    assert.equal(res.headers.get('location'), p.affiliateUrl, p.id);
    assert.equal(new URL(p.affiliateUrl).hostname, 'meli.la', p.id);
  }
});

test('product without affiliateUrl falls back to the tag URL', async () => {
  const catalog = createCatalog([{ id: 'MLB1', title: 'Sem link', url: 'https://produto.mercadolivre.com.br/MLB-1' }]);
  const srv = createApp({ config, catalog, clickStore: createClickStore({ file: null, salt: 's' }) });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  try {
    const res = await fetch(`http://127.0.0.1:${srv.address().port}/go/MLB1`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    const url = new URL(res.headers.get('location'));
    assert.equal(url.hostname, 'produto.mercadolivre.com.br');
    assert.equal(url.searchParams.get('matt_word'), 'TEST_TAG_123');
  } finally {
    await new Promise((r) => srv.close(r));
  }
});

test('unknown product returns 404', async () => {
  const res = await fetch(`${baseUrl}/produto/does-not-exist`);
  assert.equal(res.status, 404);
});

test('GET /go/:id records a click and redirects to the affiliate URL', async () => {
  const before = clickStore.events.length;
  const res = await fetch(`${baseUrl}/go/MLB3806655487?src=test`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://meli.la/13at847');

  assert.equal(clickStore.events.length, before + 1);
  const event = clickStore.events.at(-1);
  assert.equal(event.productId, 'MLB3806655487');
  assert.equal(event.source, 'test');
  assert.notEqual(event.ipHash, null);
  assert.notEqual(event.uaHash, null);
});

test('click tracking never stores the raw affiliate tag in the event', async () => {
  const res = await fetch(`${baseUrl}/go/MLB19564545`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const event = clickStore.events.at(-1);
  assert.ok(!JSON.stringify(event).includes('TEST_TAG_123'));
});

test('health endpoint reports affiliate status', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.affiliateActive, true);
});

const meta = (html, attr, name) =>
  (html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)) || [])[1];

test('robots.txt allows crawl and points to the sitemap', async () => {
  const res = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  const body = await res.text();
  assert.match(body, /^User-agent: \*$/m);
  assert.match(body, /^Sitemap: http:\/\/localhost\/sitemap\.xml$/m);
});

test('sitemap.xml lists home, categories and every product', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /xml/);
  const xml = await res.text();
  assert.ok(xml.includes('<loc>http://localhost/</loc>'));
  assert.ok(xml.includes('<loc>http://localhost/categoria/moda</loc>'));
  assert.ok(xml.includes('<loc>http://localhost/categoria/beleza</loc>'));
  for (const p of products) assert.ok(xml.includes(`<loc>http://localhost/produto/${p.slug}</loc>`), p.slug);
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('product pages have unique description, canonical, OG and valid JSON-LD', async () => {
  const descriptions = new Set();
  for (const p of products) {
    const html = await (await fetch(`${baseUrl}/produto/${p.slug}`)).text();
    const desc = meta(html, 'name', 'description');
    assert.ok(desc && desc.length > 20, p.slug);
    descriptions.add(desc);
    assert.ok(html.includes(`<link rel="canonical" href="http://localhost/produto/${p.slug}" />`), p.slug);
    assert.equal(meta(html, 'property', 'og:type'), 'product');
    assert.equal(meta(html, 'property', 'og:url'), `http://localhost/produto/${p.slug}`);
    assert.equal(meta(html, 'property', 'og:image'), p.image);
    assert.ok(meta(html, 'property', 'og:title'));
    assert.ok(meta(html, 'name', 'twitter:card'));
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const product = blocks.find((b) => b['@type'] === 'Product');
    assert.equal(product.offers.priceCurrency, 'BRL');
    assert.equal(Number(product.offers.price), p.price);
    if (p.rating) assert.equal(product.aggregateRating.ratingValue, p.rating);
    assert.ok(blocks.find((b) => b['@type'] === 'BreadcrumbList'));
    assert.match(html, /class="crumbs"[^]*href="\/categoria\//);
    assert.match(html, /Quem viu este tambem comprou/);
    assert.match(html, /class="sticky-cta"/);
    assert.match(html, /Compra segura no Mercado Livre/);
  }
  assert.equal(descriptions.size, products.length);
});

test('home has WebSite JSON-LD with SearchAction and links to category pages', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  assert.match(html, /"@type":"SearchAction"/);
  assert.ok(html.includes('<link rel="canonical" href="http://localhost/" />'));
  assert.ok(html.includes('href="/categoria/moda"'));
});

test('category pages render only their products', async () => {
  for (const [slug, name] of [['moda', 'Moda'], ['beleza', 'Beleza']]) {
    const res = await fetch(`${baseUrl}/categoria/${slug}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<h1>[^<]+<\/h1>/);
    for (const p of products) assert.equal(html.includes(`/produto/${p.slug}"`), p.category === name, `${slug}:${p.slug}`);
  }
  assert.equal((await fetch(`${baseUrl}/categoria/nada`)).status, 404);
});

test('marketing channel in ?src= is propagated to internal links and the CTA', async () => {
  const html = await (await fetch(`${baseUrl}/produto/${products[0].slug}?src=pinterest`)).text();
  assert.match(html, /href="\/go\/MLB\d+\?src=produto&ch=pinterest"/);
  assert.match(html, /href="\/categoria\/[a-z]+\?ch=pinterest"/);
  assert.match(html, /href="\/\?ch=pinterest"/);
});

test('unknown or malformed ?src= is ignored (clean internal links)', async () => {
  const html = await (await fetch(`${baseUrl}/produto/${products[0].slug}?src=${encodeURIComponent('"><script>')}`)).text();
  assert.ok(!html.includes('&ch='), 'no channel should be attached');
  assert.match(html, /href="\/go\/MLB\d+\?src=produto"/);
});

test('GET /go records the channel and placement separately', async () => {
  const before = clickStore.events.length;
  const res = await fetch(`${baseUrl}/go/MLB3806655487?src=produto&ch=tiktok`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(clickStore.events.length, before + 1);
  const event = clickStore.events.at(-1);
  assert.equal(event.source, 'produto');
  assert.equal(event.channel, 'tiktok');
  assert.equal(event.placement, 'produto');
});
