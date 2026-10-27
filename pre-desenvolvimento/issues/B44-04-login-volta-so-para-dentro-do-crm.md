# B44-04: Login volta só para dentro do CRM

**Tipo:** Implementação
**Página:** Login
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O destino de volta depois do login passa a aceitar só páginas do próprio CRM, recusando variantes com barra invertida, tabulação ou quebra de linha que o navegador lê como outro site.

## Pronto quando

Um link de login com destino `/\outro-site` leva ao Dashboard depois de entrar, e um link para `/contatos?busca=ana` continua levando para a busca.

## Critérios de aceite

- **CA-B44-16** (automática) — Link de login não leva para fora do CRM. Dado um link de login cujo destino de volta é `/\` seguido de outro site, ou tem tabulação ou quebra de linha no começo, quando a pessoa entra com e-mail e senha certos, então ela cai no Dashboard do CRM, não no outro site
- **CA-B44-17** (automática) — Link de login para uma página do CRM continua funcionando. Dado um link de login com destino de volta `/contatos?busca=ana`, quando a pessoa entra, então ela cai na lista de contatos com a busca "ana"

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
