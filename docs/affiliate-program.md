# Programa de Afiliados do Mercado Livre — ativacao

Status: **ativo.** A tag de afiliado existe e esta registrada como **segredo do
Paperclip** (`ML_AFFILIATE_TAG`), injetada em runtime. Nenhum valor de credencial
aparece em codigo, comentario ou documento.

O titular confirmou possuir a tag do programa e registrou a credencial como
segredo. O DevWeb revalidou o fluxo real de redirect e rastreamento (ver
evidencia abaixo).

## Parametro de rastreamento

O programa usa o parametro `matt_word` para anexar a tag ao link do anuncio.
O codigo le `ML_AFFILIATE_PARAM` (padrao `matt_word`); nenhum ajuste foi
necessario apos a validacao.

## Como a credencial e usada (sem expor)

- A credencial vive apenas no segredo do Paperclip, injetada como variavel de
  ambiente `ML_AFFILIATE_TAG` no processo do site.
- `lib/config.js` le o valor em runtime; `lib/affiliate.js` anexa a tag a URL.
- O log de cliques (`data/clicks.jsonl`) grava **somente a URL limpa** do
  anuncio (sem a tag) — a tag nunca entra no evento de clique.
- `.env.example` documenta a variavel sem conter valor real; `.env` e ignorado
  pelo git.

## Evidencia de validacao (MER-2)

- `node --test` — 8/8 testes passando.
- Smoke real com a credencial injetada:
  - `GET /health` → `{"status":"ok","affiliateActive":true}`
  - `GET /produto/MLB1001` → CTA `href="/go/MLB1001" rel="nofollow sponsored noopener"`
  - `GET /go/MLB1001?src=smoke` → `302 Location: ...?matt_word=<TAG>` (tag presente,
    valor redigido nos registros)
  - `data/clicks.jsonl` → evento sem a tag (`target` apenas com a URL limpa)

## Pendencias fora do escopo tecnico (humano)

- Registro do dominio (exige CPF/CNPJ e dados do titular). Ver `docs/hosting.md`.
- Publicacao em hospedagem definitiva, apos aprovacao de gasto pelo board.
