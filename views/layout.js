import { escapeHtml } from '../lib/html.js';

export function layout({ title, siteName, body, description = '', categories = [] }) {
  const nav = categories
    .map((c) => `<a href="/#cat-${escapeHtml(c.toLowerCase())}">${escapeHtml(c)}</a>`)
    .join('');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <div class="topbar">Curadoria diaria de moda e beleza no Mercado Livre &middot; compra 100% segura no Mercado Livre</div>
  <header class="site-header">
    <a class="brand" href="/">${escapeHtml(siteName)}</a>
    <nav>${nav}<a href="/#mais-vendidos" class="nav-hot">Ofertas do dia</a></nav>
    <form class="search" action="/" role="search" onsubmit="return false">
      <input id="search" type="search" placeholder="Buscar vestido, perfume..." aria-label="Buscar produtos" />
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
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        var cards = document.querySelectorAll('.card');
        if (!cards.length && q) { location.href = '/#mais-vendidos'; return; }
        cards.forEach(function (c) {
          c.hidden = q && c.getAttribute('data-search').indexOf(q) === -1;
        });
      });
    })();
  </script>
</body>
</html>
`;
}
