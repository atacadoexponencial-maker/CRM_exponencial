# B48-11: Tabela de Contatos legível e filtros recolhidos

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

- **CA-B48-26** (automática) — Palavra inteira nas células. Dado a lista de Contatos com "Médio" e "Malha" nas células, quando a tabela é desenhada, então nenhuma célula quebra palavra no meio, e a tabela rola de lado quando não cabe, com todas as colunas inteiras
- **CA-B48-27** (automática) — Tipo e atendente recolhidos. Dado a tela Contatos, quando ela abre, então ficam à vista a busca, os filtros salvos da empresa e a faixa de classificação; tipo e atendente ficam atrás de "Mais filtros", com o número dos ligados no botão
- **CA-B48-28** (manual) — Contatos no celular. Dado o celular a 390 px, quando se abre Contatos, então a primeira linha da tabela aparece na primeira tela

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A lista de Contatos mostra nome e campos personalizados quebrando só entre palavras; cidade e atendente ficam numa linha só.
2. Quando a tabela não cabe, ela rola de lado, com todas as colunas inteiras (o contêiner já tinha `overflow-x-auto`; a quebra no meio da palavra é que encolhia as colunas).
3. À vista: a busca, os filtros salvos da empresa e a faixa de classificação. Tipo e atendente ficam atrás de "Mais filtros", que diz quantos estão ligados ("Mais filtros · 2").

### Edge Cases
- Os filtros salvos continuam à vista, como a B37 aprovou: são da empresa e poucos. A recomendação do QA era recolhê-los também; a mudança ficou só em tipo e atendente.
- O Atendente não vê o filtro de atendente, como antes; "Mais filtros" mostra só o tipo.
- Palavra maior que a coluna (ex.: e-mail): continua quebrando, para não estourar a célula.

### Cenário de Erro
- Sem mudança de servidor.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-26 | automática | `src/test/contatos-tabela-legivel.test.tsx` | Nenhuma célula com quebra em qualquer ponto, atendente sem quebra, e a tabela dentro de um contêiner que rola de lado |
| CA-B48-27 | automática | `src/test/contatos-tabela-legivel.test.tsx` | Salvos e classificação à vista; tipo e atendente só depois de "Mais filtros", que passa a "Mais filtros · 2" |
| CA-B48-28 | manual | roteiro abaixo | No celular, a primeira linha da tabela aparece na primeira tela |

### Roteiro manual — CA-B48-28
1. No preview do branch, abra Contatos no celular (ou no navegador a 390 px de largura).
2. Sem rolar, a primeira linha da tabela de contatos deve aparecer.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — células sem quebra no meio da palavra; tipo e atendente atrás de "Mais filtros".
- **Modificar:** `src/test/filtros-salvos-tela.test.tsx` — abre "Mais filtros" para ver o tipo (CA-B37-34).
- **Modificar:** `src/test/remover-nicho-contato.test.tsx` — abre "Mais filtros" para ver o tipo (CA-B40-07).
- **Criar:** `src/test/contatos-tabela-legivel.test.tsx` — testes do CA-B48-26 e do CA-B48-27.

## Checklist

- [x] Células sem quebra no meio da palavra
- [x] Tipo e atendente atrás de "Mais filtros", com a contagem
- [x] Testes do CA-B48-26 e do CA-B48-27 e os da lista de Contatos passando, tsc e lint

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B48-28 | Luan | 28/10/2026 |
