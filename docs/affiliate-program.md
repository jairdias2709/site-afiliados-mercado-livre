# Programa de Afiliados do Mercado Livre — ativacao

Status: **pendente de dependencia humana** (dados do titular).

A base do site ja esta pronta para receber a credencial. Nada de credencial foi
inventado. Para concluir o entregavel 1, e necessario:

## O que falta (lista exata)

1. **Conta Mercado Livre** com e-mail verificado e dados do titular.
2. **Cadastro no Mercado Livre Afiliados** (area de afiliados do Mercado Livre):
   aceite dos termos de uso do programa.
3. **Dados do titular (exclusivamente humanos, nao inventar):**
   - CPF ou CNPJ do titular.
   - Nome completo / razao social.
   - Dados bancarios para recebimento das comissoes.
   - Verificacao de identidade (documento / telefone).
4. **Site no ar com conteudo real** (o programa pode exigir dominio ativo para
   analise/aprovacao).
5. **Apos aprovacao:** copiar a tag/ID de afiliado fornecida pelo programa.

## Como registrar a credencial (sem expor)

Assim que a tag de afiliado existir, registre-a como **segredo no Paperclip**
(nunca em arquivo, comentario ou documento). O nome logico usado pelo codigo e:

```
ML_AFFILIATE_TAG
```

O servidor le essa variavel em runtime. Confirme tambem o parametro correto de
rastreamento gerado pelo programa (`ML_AFFILIATE_PARAM`); o padrao atual e
`matt_word`.

## Codigo ja preparado

- `lib/affiliate.js` monta a URL adicionando a tag apenas se presente.
- `server.js` avisa no log quando a tag esta ausente (modo desenvolvimento).
- `.env.example` documenta a variavel sem conter valor real.

## Responsavel pelo proximo passo

Titular humano (via CEO), pois exige CPF/CNPJ e dados bancarios que um agente
nao pode fornecer. DevWeb conclui a configuracao tecnica ao receber o segredo.
