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
  for (const p of products) assert.ok(html.includes(`href="/go/${p.id}"`) || html.includes(`/produto/${p.slug}`), p.id);
  assert.match(html, /<\/html>/);
});

test('every product page renders title, image and affiliate CTA', async () => {
  for (const p of products) {
    const res = await fetch(`${baseUrl}/produto/${p.slug}`);
    assert.equal(res.status, 200, p.slug);
    const html = await res.text();
    assert.ok(html.includes(`picsum.photos/seed/${p.id}`), p.id);
    assert.ok(html.includes(`href="/go/${p.id}"`), p.id);
    assert.match(html, /rel="nofollow sponsored noopener"/);
  }
});

test('every /go/:id redirects to its listing with the affiliate tag', async () => {
  for (const p of products) {
    const res = await fetch(`${baseUrl}/go/${p.id}`, { redirect: 'manual' });
    assert.equal(res.status, 302, p.id);
    const url = new URL(res.headers.get('location'));
    assert.equal(url.origin + url.pathname, new URL(p.url).origin + new URL(p.url).pathname);
    assert.equal(url.searchParams.get('matt_word'), 'TEST_TAG_123');
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
  const location = res.headers.get('location');
  const url = new URL(location);
  assert.equal(url.hostname, 'produto.mercadolivre.com.br');
  assert.equal(url.searchParams.get('matt_word'), 'TEST_TAG_123');

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
