import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { buildAffiliateUrl } from './affiliate.js';
import { renderHome, renderNotFound, renderProduct } from '../views/pages.js';

const PUBLIC_FILES = new Map([['/public/styles.css', 'text/css; charset=utf-8']]);

export function createHandler({ config, catalog, clickStore }) {
  async function recordClick(req, product) {
    const forwarded = config.trustProxy ? req.headers['x-forwarded-for'] : null;
    const ip = (forwarded ? String(forwarded).split(',')[0].trim() : null) || req.socket.remoteAddress;
    const event = clickStore.record({
      productId: product.id,
      slug: product.slug,
      // Store the clean listing URL only; the affiliate tag is a secret and must
      // never be written to the click log.
      target: product.url,
      source: new URL(req.url, config.baseUrl).searchParams.get('src') || 'redirect',
      referer: req.headers.referer || null,
      ip,
      userAgent: req.headers['user-agent'] || null,
    });
    await clickStore.persist(event);
    return event;
  }

  function sendHtml(res, status, html) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  return async function handler(req, res) {
    try {
      const url = new URL(req.url, config.baseUrl);
      const { pathname } = url;

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

      if (pathname === '/' || pathname === '') {
        sendHtml(
          res,
          200,
          renderHome({
            siteName: config.siteName,
            tagline: config.siteTagline,
            products: catalog.all(),
            categories: catalog.categories(),
          }),
        );
        return;
      }

      const productMatch = pathname.match(/^\/produto\/([^/]+)\/?$/);
      if (productMatch) {
        const product = catalog.find(decodeURIComponent(productMatch[1]));
        if (!product) {
          sendHtml(res, 404, renderNotFound({ siteName: config.siteName }));
          return;
        }
        sendHtml(res, 200, renderProduct({ siteName: config.siteName, product }));
        return;
      }

      const goMatch = pathname.match(/^\/go\/([^/]+)\/?$/);
      if (goMatch) {
        const product = catalog.find(decodeURIComponent(goMatch[1]));
        if (!product) {
          sendHtml(res, 404, renderNotFound({ siteName: config.siteName }));
          return;
        }
        const target = buildAffiliateUrl(product.url, config);
        await recordClick(req, product);
        res.writeHead(302, {
          Location: target,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer-when-downgrade',
        });
        res.end();
        return;
      }

      sendHtml(res, 404, renderNotFound({ siteName: config.siteName }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Internal Server Error: ${error.message}`);
    }
  };
}

export function createApp(deps) {
  return http.createServer(createHandler(deps));
}
