import { escapeHtml } from '../lib/html.js';

export function layout({ title, siteName, body, description = '' }) {
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
  <header class="site-header">
    <a class="brand" href="/">${escapeHtml(siteName)}</a>
    <nav><a href="/">Inicio</a></nav>
  </header>
  <main class="container">
${body}
  </main>
  <footer class="site-footer">
    <p>Este site pode receber comissao por compras feitas pelos links do Mercado Livre. Precos e disponibilidade podem mudar.</p>
  </footer>
</body>
</html>
`;
}
