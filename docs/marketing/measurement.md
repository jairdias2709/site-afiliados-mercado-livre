# Marketing e medicao - trafego orgânico rumo a R$ 6.000/mes

Documento operacional do agente Marketing. Descreve como atribuímos cliques por
canal, como medimos conversao e comissao, e o ritual semanal. Faz parte do P3 do
plano de SEO e conversao ([MER-10](/MER/issues/MER-10)).

## Condicao de sucesso

Aumentar trafego orgânico qualificado para as paginas de produto e converter
clique em compra, atingindo **R$ 6.000/mes de comissao liquida**. Ate o organico
ser validado, **nao gastamos em trafego pago** (politica da empresa).

## Como a atribuicao funciona

Links de divulgacao apontam para paginas do site com `?src=<canal>`:

```
https://site-afiliados-mercado-livre.vercel.app/produto/<slug>?src=pinterest
https://site-afiliados-mercado-livre.vercel.app/categoria/moda?src=tiktok
https://site-afiliados-mercado-livre.vercel.app/?src=comunidade
```

Ao entrar, o site captura o `src` (validado contra a lista de canais), propaga-o
internamente como `?ch=<canal>` nos links de produto/categoria e no botao de
compra, e registra no `/go/:id`:

- `channel` — canal de aquisicao (`src` da entrada);
- `placement` — posicao do clique na pagina (`produto`, `card`, `sticky`, ...);
- `source` — mantido por compatibilidade (igual a `placement`).

Eventos sao anonimos (IP/UA hasheados) e gravados em `data/clicks.jsonl`
(local) ou no log de runtime como `[click] {json}` (Vercel, filesystem efêmero).

### Canais padronizados (`src`)

| `src` | Canal | Observacao |
| --- | --- | --- |
| `pinterest` | Pinterest | Pins levam ao produto ou a categoria. |
| `tiktok` | TikTok | Bio/link e descricao de video. |
| `instagram` | Instagram | Bio, stories com link. |
| `facebook` | Facebook | Pagina/perfil e grupos. |
| `whatsapp` | WhatsApp | Listas e grupos de ofertas. |
| `comunidade` | Comunidades | Foruns/grupos (ex.: grupos de achados). |
| `reddit` | Reddit | Subreddits de promocao. |
| `youtube` | YouTube | Descricao de videos/Shorts. |
| `email` | Newsletter | Disparos proprios. |
| `organico` | Busca organica | Google/Bing. |
| `direto` | Acesso direto | Sem `src`. |
| `outros` | Outros | Fallback. |

Um mesmo link so pode ter um `src`. Use sempre o canal de origem da divulgacao.

## Como rodar o dashboard semanal

```bash
# local (data/clicks.jsonl)
node scripts/weekly-report.mjs --days 7

# com conversoes confirmadas exportadas do painel de afiliado
node scripts/weekly-report.mjs --days 7 \
  --conversions data/conversions.jsonl \
  --cvr 0.015 --avg-commission 12 --goal 6000

# salvar o relatorio
node scripts/weekly-report.mjs --days 7 --out report/semanal.md
```

Saida: cliques por canal, por posicao, top produtos, serie diaria e progresso da
meta. Sem arquivo de conversoes o relatorio mostra uma **projecao** com a CVR e o
ticket medio informados (claramente rotulada como estimativa).

`data/conversions.jsonl` (opcional, uma linha por venda confirmada):

```json
{"ts":"2026-10-11T15:00:00.000Z","productId":"MLB123","commission":14.20,"quantity":1}
```

## Rotina semanal (segunda-feira)

1. Exportar/atualizar `data/conversions.jsonl` a partir do painel de afiliado.
2. Rodar `scripts/weekly-report.mjs` e anexar o Markdown no issue da rotina.
3. Comparar com a semana anterior: qual canal cresceu, qual produto converte.
4. Dobrar no que funciona; desligar o canal sem clique.

Ritual registrado como rotina do agente Marketing (`routine` weekly).

## Search Console e Bing Webmaster (item 17 do plano)

Passos (dependem de acesso a conta Google/Bing):

1. Search Console -> Add property -> URL prefix
   `https://site-afiliados-mercado-livre.vercel.app`.
2. Verificar por tag HTML: o token deve ser exposto pelo site (ex.: env
   `GOOGLE_SITE_VERIFICATION` renderizada em `<meta>`) ou por arquivo em `public/`.
   Verificação por DNS nao se aplica a subdominio `vercel.app`.
3. Enviar `https://.../sitemap.xml` e pedir indexacao da home e das categorias.
4. Bing Webmaster Tools: importar do Search Console (mesmo sitemap).
5. Monitorar semanalmente: paginas indexadas, queries, impressoes, CTR.

Ate a verificacao existir, o corpo tecnico ja esta pronto (`robots.txt`,
`sitemap.xml`, canonical, OG, JSON-LD), entao a indexacao organica acontece sem
bloqueio.

## Verificacao continua (item 19 do plano)

- `npm test` cobre renderizacao, tracking e atribuicao de canal.
- Rodar Lighthouse SEO e o Rich Results Test a cada mudanca de template.