# B20-01: Atualizar o Next.js para a versão corrigida

**Tipo:** Implementação
**Página:** Todas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 3

## Descrição

Atualizar o Next.js da versão 16.2.4 para a versão corrigida mais recente da mesma
linha, que fecha as falhas públicas (drible do middleware, derrubar o servidor com
Server Actions, SSRF em rewrites e outras).

## Pronto quando

`npm audit` não acusa mais o Next.js; build, lint e testes automatizados passam; e as
telas principais (login, chat, pipeline, contatos, campanhas, catálogo, loja pública)
abrem normalmente no CRM publicado.

## Cenários

### Happy Path
1. `next` e `eslint-config-next` de 16.2.4 para **16.3.8**, a versão que o `npm audit`
   indica como correção (última da linha 16.3; a 16.4.0 é uma linha nova, fica fora).
   React 19.2.4 atende ao requisito da 16.3.8 (`^19.0.0`).
2. `npm install` atualiza o `package-lock.json`; build, lint e testes passam.
3. Depois do deploy, as telas principais abrem no CRM publicado.

### Edge Cases
- Dependências indiretas com aviso que só a 16.3.8 corrige (`postcss`, `sharp`) sobem junto.
- Os demais avisos do `npm audit` (ferramentas de desenvolvimento como `shadcn`) ficam
  fora desta issue — não rodam no servidor publicado.

### Cenário de Erro
- Se o build ou algum teste quebrar com a versão nova, para e reporta antes de publicar.

## Arquivos

- **Modificar:** `package.json` — `next` e `eslint-config-next` para `16.3.8`.
- **Modificar:** `package-lock.json` — gerado pelo `npm install`.

## Dependências Externas

- `next@16.3.8` — notas de versão da Vercel/Next.js.

## Checklist

- [x] `package.json` e `package-lock.json` com `next` e `eslint-config-next` 16.3.8
- [x] `npm audit --omit=dev` sem aviso do `next`
- [x] Build, lint e suíte de testes passando
- [x] Publicado; login, chat, pipeline, contatos, campanhas, catálogo e loja abrem (status 200/redirect esperado)
