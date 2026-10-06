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

test('home page renders all sample products', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Vestido Midi Floral/);
  assert.match(html, /Kit Skincare Facial Vitamina C/);
  assert.match(html, /<\/html>/);
});

test('product page renders title, image, description and affiliate CTA', async () => {
  const res = await fetch(`${baseUrl}/produto/mlb1001`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Vestido Midi Floral Verão/);
  assert.match(html, /picsum\.photos\/seed\/mlb1001/);
  assert.match(html, /estampa floral/);
  assert.match(html, /href="\/go\/MLB1001"/);
  assert.match(html, /rel="nofollow sponsored noopener"/);
});

test('unknown product returns 404', async () => {
  const res = await fetch(`${baseUrl}/produto/does-not-exist`);
  assert.equal(res.status, 404);
});

test('GET /go/:id records a click and redirects to the affiliate URL', async () => {
  const before = clickStore.events.length;
  const res = await fetch(`${baseUrl}/go/MLB2001?src=test`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const location = res.headers.get('location');
  const url = new URL(location);
  assert.equal(url.hostname, 'produto.mercadolivre.com.br');
  assert.equal(url.searchParams.get('matt_word'), 'TEST_TAG_123');

  assert.equal(clickStore.events.length, before + 1);
  const event = clickStore.events.at(-1);
  assert.equal(event.productId, 'MLB2001');
  assert.equal(event.source, 'test');
  assert.notEqual(event.ipHash, null);
  assert.notEqual(event.uaHash, null);
});

test('click tracking never stores the raw affiliate tag in the event', async () => {
  const res = await fetch(`${baseUrl}/go/MLB1001`, { redirect: 'manual' });
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
