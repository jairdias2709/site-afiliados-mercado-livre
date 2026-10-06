# Dominio e hospedagem — decisao

Status: **decisao tecnica tomada; registro do dominio depende do titular (humano).**

## Requisitos

- Servir HTML das paginas (home + produto).
- Executar o endpoint `/go/:id` que registra o clique e redireciona (server-side,
  nao apenas JS no navegador).
- HTTPS.
- Custo minimo (meta: R$ 6.000/mes liquidos em ate 3 meses).

## Opcao recomendada: Cloudflare Pages + Worker (custo R$ 0)

- Pagina inicial e paginas de produto estaticas no **Cloudflare Pages** (free tier).
- Rede/redirecionamento de afiliado e contagem de cliques em um **Cloudflare
  Worker** (free tier), usando **Workers KV** ou **Analytics Engine** para o log
  de cliques.
- HTTPS e CDN inclusos.
- Vantagem: sem servidor para manter, custo zero no inicio.
- Ressalva: exige conta Cloudflare e adaptar `lib/app.js` para o Worker (o
  formato de clique permanece o mesmo JSONL/evento).

## Opcao alternativa: VPS + Node (custo baixo)

- VPS pequena (~EUR 4/mes) rodando `node server.js` atras de Caddy/Nginx com
  HTTPS automatico.
- Usa exatamente o codigo deste repositorio, sem adaptacao.
- Vantagem: menor esforco de migracao; desvantagem: custo mensal e manutencao.

## Dominio

- Registrar um `.com.br` no **Registro.br** (aprox. R$ 40/ano) ou no registrar
  da Cloudflare.
- Exige CPF/CNPJ e dados do titular — **dependencia humana** (o CEO deve obter do
  titular; nao inventar).
- Sugestao de nome: `achadosdemoda.com.br` (a validar disponibilidade).

## Recomendacao

1. Curto prazo (validar trafego): Cloudflare Pages + Worker, dominio proprio.
2. Ao crescer/complexidade de back-office: migrar para VPS com o codigo atual.

Nenhum gasto deve ser iniciado sem aprovacao do board (registro de dominio e/ou
VPS). Registrar a solicitacao de aprovacao quando o titular fornecer os dados.
