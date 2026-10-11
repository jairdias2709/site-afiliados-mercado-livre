import { escapeHtml } from '../lib/html.js';
import { categoryPath, jsonLdScript } from '../lib/seo.js';

export function layout({
  title,
  siteName,
  body,
  description = '',
  categories = [],
  baseUrl = '',
  path = '/',
  image = '',
  ogType = 'website',
  jsonLd = [],
  robots = 'index, follow',
}) {
  const nav = categories
    .map((c) => `<a href="${categoryPath(c)}">${escapeHtml(c)}</a>`)
    .join('');
  const canonical = `${baseUrl}${path}`;
  const e = escapeHtml;
  const meta = [
    `<link rel="canonical" href="${e(canonical)}" />`,
    `<meta name="robots" content="${e(robots)}" />`,
    `<meta property="og:site_name" content="${e(siteName)}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:type" content="${e(ogType)}" />`,
    `<meta property="og:title" content="${e(title)}" />`,
    `<meta property="og:description" content="${e(description)}" />`,
    `<meta property="og:url" content="${e(canonical)}" />`,
    image ? `<meta property="og:image" content="${e(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${e(title)}" />`,
    `<meta name="twitter:description" content="${e(description)}" />`,
    image ? `<meta name="twitter:image" content="${e(image)}" />` : '',
    ...jsonLd.map(jsonLdScript),
  ]
    .filter(Boolean)
    .map((l) => `  ${l}`)
    .join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
${meta}
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <div class="topbar">Curadoria diaria de moda e beleza no Mercado Livre &middot; compra 100% segura no Mercado Livre</div>
  <header class="site-header">
    <a class="brand" href="/">${escapeHtml(siteName)}</a>
    <nav>${nav}<a href="/#mais-vendidos" class="nav-hot">Ofertas do dia</a></nav>
    <form class="search" action="/" role="search">
      <input id="search" name="q" type="search" placeholder="Buscar vestido, perfume..." aria-label="Buscar produtos" />
    </form>
  </header>
  <main class="container">
${body}
  </main>
  <footer class="site-footer">
    <p>Este site pode receber comissao por compras feitas pelos links do Mercado Livre. Precos e disponibilidade podem mudar.</p>
  </footer>
  <script>
    (function () {
      var input = document.getElementById('search');
      if (!input) return;
      // Live filter only on the full catalog (home); elsewhere the form submits to /?q=.
      var list = document.getElementById('mais-vendidos');
      if (!list) return;
      function filter() {
        var q = input.value.trim().toLowerCase();
        list.querySelectorAll('.card').forEach(function (c) {
          c.hidden = q && c.getAttribute('data-search').indexOf(q) === -1;
        });
      }
      input.addEventListener('input', filter);
      input.form.addEventListener('submit', function (ev) {
        ev.preventDefault(); filter(); list.scrollIntoView();
      });
      var initial = new URLSearchParams(location.search).get('q');
      if (initial) { input.value = initial; filter(); }
    })();
  </script>
</body>
</html>
`;
}
