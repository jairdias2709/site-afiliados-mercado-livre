import { createApp } from './lib/app.js';
import { loadConfig, affiliateStatus } from './lib/config.js';
import { loadProducts, createCatalog } from './lib/products.js';
import { createClickStore } from './lib/tracker.js';

const config = loadConfig();

const products = await loadProducts();
const catalog = createCatalog(products);
const clickStore = createClickStore({ file: config.clicksFile, salt: config.clickHashSalt });

const server = createApp({ config, catalog, clickStore });

server.listen(config.port, config.host, () => {
  const status = affiliateStatus(config);
  console.log(`[site-afiliados] ouvindo em http://${config.host}:${config.port}`);
  console.log(
    status.active
      ? `[site-afiliados] link de afiliado ativo (param=${status.param})`
      : '[site-afiliados] AVISO: ML_AFFILIATE_TAG ausente; links redirecionam sem tag de afiliado.',
  );
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { server };
