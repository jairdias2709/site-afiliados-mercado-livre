import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { buildAffiliateUrl } from './affiliate.js';
import { normalizeChannel } from './channels.js';
import { renderCategory, renderHome, renderNotFound, renderProduct } from '../views/pages.js';
import { renderRobots, renderSitemap } from './seo.js';
import { slugify } from './products.js';

const PUBLIC_FILES = new Map([['/public/styles.css', 'text/css; charset=utf-8']]);

export function createHandler({ config, catalog, clickStore, categoryCopy = {} }) {
  const lastmod = (config.lastmod || new Date().toISOString()).slice(0, 10);
  const common = () => ({ siteName: config.siteName, baseUrl: config.baseUrl, categories: catalog.categories() });
  async function recordClick(req, product) {
    const forwarded = config.trustProxy ? req.headers['x-forwarded-for'] : null;
    const ip = (forwarded ? String(forwarded).split(',')[0].trim() : null) || req.socket.remoteAddress;
    const params = new URL(req.url, config.baseUrl).searchParams;
    const placement = params.get('src') || 'redirect';
    const channel = normalizeChannel(params.get('ch'));
    const event = clickStore.record({
      productId: product.id,
      slug: product.slug,
      // Store the clean listing URL only; the affiliate tag is a secret and must
      // never be written to the click log.
      target: product.url,
      source: placement,
      channel,
      placement,
      referer: req.headers.referer || null,
      ip,
      userAgent: req.headers['user-agent'] || null,
    });
    await clickStore.persist(event);
    return event;
  }

  function send(res, status, type, body) {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' });
    res.end(body);
  }

  function sendHtml(res, status, html) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  return async function handler(req, res) {
    try {
      const url = new URL(req.url, config.baseUrl);
      const { pathname } = url;
      // Marketing links use `?src=<channel>` on entry pages; it is normalized
      // here and propagated internally so the later /go click keeps the channel.
      const channel = normalizeChannel(url.searchParams.get('src'));

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', affiliateActive: Boolean(config.affiliateTag) }));
        return;
      }

      if (PUBLIC_FILES.has(pathname)) {
        const file = new URL(`../${pathname.replace(/^\//, '')}`, import.meta.url);
        const content = await readFile(file);
        res.writeHead(200, { 'Content-Type': PUBLIC_FILES.get(pathname) });
        res.end(content);
        return;
      }

      if (pathname === '/robots.txt') {
        send(res, 200, 'text/plain; charset=utf-8', renderRobots(config));
        return;
      }

      if (pathname === '/sitemap.xml') {
        send(
          res,
          200,
          'application/xml; charset=utf-8',
          renderSitemap({ baseUrl: config.baseUrl, products: catalog.all(), categories: catalog.categories(), lastmod }),
        );
        return;
      }

      if (pathname === '/' || pathname === '') {
        sendHtml(res, 200, renderHome({ ...common(), channel, tagline: config.siteTagline, products: catalog.all() }));
        return;
      }

      const categoryMatch = pathname.match(/^\/categoria\/([^/]+)\/?$/);
      if (categoryMatch) {
        const category = catalog.findCategory(decodeURIComponent(categoryMatch[1]));
        if (!category) {
          sendHtml(res, 404, renderNotFound(common()));
          return;
        }
        sendHtml(
          res,
          200,
          renderCategory({ ...common(), channel, category, copy: categoryCopy[slugify(category)], products: catalog.byCategory(category) }),
        );
        return;
      }

      const productMatch = pathname.match(/^\/produto\/([^/]+)\/?$/);
      if (productMatch) {
        const product = catalog.find(decodeURIComponent(productMatch[1]));
        if (!product) {
          sendHtml(res, 404, renderNotFound(common()));
          return;
        }
        sendHtml(
          res,
          200,
          renderProduct({ ...common(), channel, product, related: catalog.related(product), crossSell: catalog.crossSell(product) }),
        );
        return;
      }

      const goMatch = pathname.match(/^\/go\/([^/]+)\/?$/);
      if (goMatch) {
        const product = catalog.find(decodeURIComponent(goMatch[1]));
        if (!product) {
          sendHtml(res, 404, renderNotFound(common()));
          return;
        }
        const target = product.affiliateUrl || buildAffiliateUrl(product.url, config);
        await recordClick(req, product);
        res.writeHead(302, {
          Location: target,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer-when-downgrade',
        });
        res.end();
        return;
      }

      sendHtml(res, 404, renderNotFound(common()));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Internal Server Error: ${error.message}`);
    }
  };
}

export function createApp(deps) {
  return http.createServer(createHandler(deps));
}
