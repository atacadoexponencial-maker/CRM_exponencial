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
