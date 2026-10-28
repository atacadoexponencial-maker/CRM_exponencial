# B47-19: Telas menos carregadas

**Tipo:** Correção
**Página:** Chat (lista), ficha do contato, Pipeline (painel do card), Alertas, Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-06**, **C-10**, **C-14**, **C-22** e **C-34**
**Gravidade:** Clareza

## Descrição

Filtros demais no Chat, dois Editar na ficha, painel do card que fecha ao mover, alertas sem agrupar e filtro do Dashboard misturado.

## Pronto quando

Cada uma dessas telas fica com menos passos e menos coisa à vista, como nos critérios.

## Critérios de aceite

- **CA-B47-46** (automática) — Filtros do Chat numa linha. Dado a lista de conversas, quando é desenhada, então "Minhas / Meu time / Todas" e o status ficam no mesmo seletor, e as etiquetas atrás de um botão "Etiquetas" (C-10)
- **CA-B47-47** (automática) — Um Editar só na ficha. Dado a ficha do contato, quando se clica em Editar, então os dados do contato e os campos personalizados ficam editáveis juntos, com um Salvar (C-14)
- **CA-B47-48** (automática) — Mover pelo painel mantém o painel aberto. Dado o painel do card aberto, quando se move o card de etapa pela lista, então o painel continua aberto, com a etapa nova e o histórico atualizado (C-06)
- **CA-B47-49** (automática) — Alertas agrupados e filtro do Dashboard separado. Dado 46 alertas de "Lead sem resposta" e o filtro "Todos os contatos" do Dashboard, quando as telas são desenhadas, então os alertas aparecem agrupados por tipo, com "ver mais", e o filtro do Dashboard separa os grupos de contato dos campos (C-34, C-22)

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
