# B21-08: Cabeçalhos de segurança no site

**Tipo:** Implementação
**Página:** Todo o site (CRM, loja, páginas públicas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 7

## Descrição

Toda resposta passa a sair com as proteções básicas do navegador: proibir moldura de outro
site, não adivinhar tipo de arquivo, conexão segura sempre e "de onde veio" limitado. Sem
política completa de conteúdo (CSP).

## Pronto quando

Os cabeçalhos aparecem nas respostas do CRM, da loja e do login; CRM, loja e conexão com a
Meta funcionam como hoje; e um teste automatizado confere a presença dos cabeçalhos.

## Cenários

> Levantamento de 08/10: nenhum cabeçalho de segurança configurado (`next.config.ts` e
> `vercel.json`); nenhuma tela do sistema usa iframe. O login da Meta abre em janela
> própria (popup), que não é afetada por `frame-ancestors`.

### Happy Path
Toda resposta (CRM, loja, páginas públicas, APIs) sai com `X-Frame-Options: DENY`,
`Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security: max-age=63072000; includeSubDomains` e
`Referrer-Policy: strict-origin-when-cross-origin`.

### Edge Cases
- Sem CSP de scripts: `default-src`/`script-src` ficam de fora (login da Meta).
- A loja também não pode ser embutida em outro site (decisão da spec: "todo o site").

### Cenário de Erro
Outro site tenta exibir o CRM numa moldura: o navegador recusa.

## Arquivos

- **Modificar:** `next.config.ts` — `headers()` para `/:path*`.
- **Criar:** `src/test/cabecalhos-seguranca.test.ts` — confere os cabeçalhos e a ausência de CSP de scripts.

## Checklist

- [x] Cabeçalhos no `next.config.ts`
- [x] Teste passando e build ok
- [x] No ar e conferido em produção com uma requisição real
