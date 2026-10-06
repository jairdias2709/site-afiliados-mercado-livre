// Vercel serverless entrypoint: every route is rewritten here (see vercel.json).
import { createHandler } from '../lib/app.js';
import { loadConfig } from '../lib/config.js';
import { loadProducts, createCatalog } from '../lib/products.js';
import { createClickStore } from '../lib/tracker.js';

const config = loadConfig();
const catalog = createCatalog(await loadProducts());
const clickStore = createClickStore({ file: null, salt: config.clickHashSalt, sink: config.clickSink });

export default createHandler({ config, catalog, clickStore });
