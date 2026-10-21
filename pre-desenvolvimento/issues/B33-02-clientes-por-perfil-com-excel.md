# B33-02: Clientes por perfil, filtro pela matriz e Excel

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba RFV
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-rfv.md`

## Descrição

Entra a lista de clientes por perfil (25 por página): nome com link para o perfil do contato, perfil, R, F, V, FV, dias sem compra, vendas e valor em 12 meses, última venda, atendente, cidade e UF; busca pelo nome, seletor de perfil, filtro pela célula clicada na matriz (com o chip "Campeão · R 5 · FV 5" e o ×) e botão Excel que baixa o filtro atual (`GET /relatorios/rfv/exportar?...`). Depende da B33-01.

## Pronto quando

Na empresa de teste, clicar numa célula da matriz lista só aqueles clientes; escolher "Campeão" e digitar parte de um nome filtra; a paginação avança de 25 em 25; Excel baixa as linhas filtradas com as mesmas colunas.

## Critérios de aceite

- **CA-B33-07** (automática) — Clicar na célula filtra a lista. Dado a matriz com clientes em duas células, quando o usuário clica na célula R 5 / FV 5, então a lista de clientes mostra só os daquela célula e indica o filtro ("Campeão · R 5 · FV 5"); clicar de novo limpa.
- **CA-B33-10** (automática) — Lista com as colunas e a paginação. Dado 30 clientes na base, quando o usuário abre a lista, então aparecem 25 linhas com nome, perfil, R, F, V, FV, dias sem compra, vendas e valor em 12 meses, última venda, atendente, cidade e UF, o rodapé diz "Mostrando 1–25 de 30" e a seta avança para os 5 restantes.
- **CA-B33-11** (automática) — Filtro por perfil e busca. Dado clientes Campeão e Perdido, entre eles "Loja da Ana" (Campeão), quando o usuário escolhe "Campeão" e digita "ana", então só a "Loja da Ana" fica na lista.
- **CA-B33-12** (automática) — Excel com o filtro atual. Dado a lista filtrada em "Campeão" com 2 clientes, quando o usuário clica em Excel, então baixa uma planilha com as 2 linhas e as colunas da lista, com datas e números reconhecidos como tal.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B33-06 | O Excel da lista traz as mesmas colunas da tela e respeita o filtro atual (perfil ou célula e busca). | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
