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

## Cenários

### Happy Path
1. Abaixo da matriz e dos indicadores entra a lista "Clientes por perfil RFV": 25 por página, ordenada pelo perfil mais valioso e depois por menos dias sem compra, com nome (link para o perfil), perfil (chip colorido), R, F, V, FV, dias sem compra, vendas e valor em 12 meses, última venda, atendente do contato, cidade e UF.
2. Clicar numa célula da matriz filtra a lista por R e FV e mostra o chip "Campeão · R 5 · FV 5" com um ×; clicar de novo na célula, ou no ×, limpa.
3. O seletor de perfil e a busca filtram; a paginação avança e volta; o rodapé diz "Mostrando 1–25 de 30 clientes".
4. "Excel" abre `GET /relatorios/rfv/exportar?...` com o filtro atual; a rota recalcula o RFV, filtra e baixa `rfv-<perfil>-<data>.xlsx` no padrão da B30-04.

### Edge Cases
- Base vazia: "Nenhum cliente com compra."; filtro sem resultado: "Nenhum cliente com esse filtro."
- Mudar busca ou perfil volta para a primeira página.
- Célula e perfil combinados: os dois valem (interseção).
- Filtro inválido na URL (perfil desconhecido, R ou FV fora de 1–5): 400.

### Cenário de Erro
- Sem sessão, a rota devolve 401.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B33-07 | automática | `src/test/relatorios-rfv-lista.test.tsx` | Clicar na célula R 5 / FV 5 deixa só os clientes dela e mostra o chip; clicar de novo limpa |
| CA-B33-10 | automática | `src/test/relatorios-rfv-lista.test.tsx` | 30 clientes: 25 linhas com as colunas, "Mostrando 1–25 de 30 clientes", a seta avança para 5 |
| CA-B33-11 | automática | `src/test/relatorios-rfv-lista.test.tsx` | "Campeão" + "ana" deixa só a "Loja da Ana" |
| CA-B33-12 | automática | `src/test/relatorios-rfv-exportar.integration.test.ts` | A rota com `perfil=campeao` baixa 2 linhas com as colunas da lista, data e número como tal |

## Banco de Dados

Não se aplica.

## Arquivos

- **Criar:** `src/lib/relatorios/exportar-rfv.ts` — filtro e ordem da lista, colunas da planilha, filtro ↔ URL.
- **Criar:** `src/app/(auth)/relatorios/rfv/exportar/route.ts` — GET que baixa a planilha.
- **Criar:** `src/app/(auth)/relatorios/components/lista-clientes-rfv.tsx` — a lista com busca, perfil, chip da célula, paginação e Excel.
- **Modificar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — desenha a lista abaixo da matriz e passa a célula selecionada.
- **Criar:** `src/test/relatorios-rfv-lista.test.tsx` — CA-B33-07, 10 e 11.
- **Criar:** `src/test/relatorios-rfv-exportar.integration.test.ts` — CA-B33-12.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Filtro, ordem e colunas da lista na lib
- [x] Rota de exportação com o filtro da URL
- [x] Lista na aba, ligada à célula da matriz
- [x] Testes passando
