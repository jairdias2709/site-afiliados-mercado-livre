# Site Afiliados Mercado Livre

Site proprio que divulga produtos de **Moda e Beleza** do Mercado Livre com
links de afiliado e rastreamento de cliques.

Base do projeto (MER-2): pagina inicial, template de pagina de produto e
redirecionamento de afiliado com registro de cliques.

## Stack

- Node.js (>= 20), **sem dependencias externas**.
- Servidor HTTP proprio + templates em JavaScript (template strings).
- Dados de produtos em `data/products.json`.
- Cliques registrados em `data/clicks.jsonl` (JSON Lines, anonimizados).

## Rodando localmente

```bash
cp .env.example .env      # preencha localmente, nunca versione
npm start                 # http://localhost:3000
npm test                  # suite de testes (node:test)
```

O servidor sobe sem `ML_AFFILIATE_TAG` para desenvolvimento, mas avisa no log
que os links redirecionam **sem** tag de afiliado.

## Variaveis de ambiente

| Variavel | Descricao |
| --- | --- |
| `ML_AFFILIATE_TAG` | Credencial de afiliado. **Segredo** — nunca no codigo. |
| `ML_AFFILIATE_PARAM` | Parametro de rastreamento no link (padrao `matt_word`). |
| `CLICK_HASH_SALT` | Salt para anonimizar IP/User-Agent dos cliques. |
| `PORT` / `HOST` / `BASE_URL` / `SITE_NAME` | Configuracao do servidor/site. |
| `CLICKS_FILE` | Caminho do arquivo JSONL de cliques. |

## Rotas

| Rota | Descricao |
| --- | --- |
| `GET /` | Pagina inicial com grade de produtos. |
| `GET /produto/:id-ou-slug` | Pagina de produto (titulo, imagem, descricao, botao). |
| `GET /go/:id-ou-slug` | Registra o clique e redireciona (302) ao Mercado Livre. |
| `GET /health` | Healthcheck + status da credencial de afiliado. |
| `GET /public/styles.css` | Folha de estilo. |

## Fluxo de afiliado e rastreamento

1. O botao da pagina de produto aponta para `/go/:id` (mesma origem).
2. O servidor monta a URL final e anexa a tag de afiliado a partir de
   `ML_AFFILIATE_TAG` (segredo em runtime; nunca gravada no repositorio).
3. Antes de redirecionar, o clique e registrado em `data/clicks.jsonl` com
   IP e User-Agent **hasheados**.
4. A resposta e `302 Location: <url do Mercado Livre>`.

## Documentos

- [`docs/affiliate-program.md`](docs/affiliate-program.md) — credencial ativa, parametro e como o segredo e usado.
- [`docs/hosting.md`](docs/hosting.md) — decisao de dominio e hospedagem.

## Convencoes

- Sem comentarios supérfluos; codigo legivel.
- Nenhum segredo no codigo, comentario ou documento. Use segredo do Paperclip.
- Testes com `node --test` cobrindo renderizacao e rastreamento.
