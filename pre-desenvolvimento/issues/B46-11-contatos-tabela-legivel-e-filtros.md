# B46-11: Tabela de Contatos legível e filtros recolhidos

**Tipo:** Correção
**Página:** Contatos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-05**, **C-11** e **C-37**
**Gravidade:** Médio

## Descrição

A tabela quebra palavra no meio e corta a coluna Atendente. Quatro faixas de filtro ficam à vista, e no celular tomam a primeira tela.

## Pronto quando

As células mostram palavras inteiras, a tabela rola de lado quando precisa, e só a busca e a classificação ficam à vista.

## Critérios de aceite

- **CA-B46-26** (automática) — Palavra inteira nas células. Dado a lista de Contatos com "Médio" e "Malha" nas células, quando a tabela é desenhada, então nenhuma célula quebra palavra no meio, e a tabela rola de lado quando não cabe, com todas as colunas inteiras
- **CA-B46-27** (automática) — Só a busca e a classificação ficam à vista. Dado a tela Contatos, quando ela abre, então ficam à vista a busca e a faixa de classificação; tipo, atendente e salvos ficam atrás de "Filtrar", com o número de filtros ligados no botão
- **CA-B46-28** (manual) — Contatos no celular. Dado o celular a 390 px, quando se abre Contatos, então a primeira linha da tabela aparece na primeira tela

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
