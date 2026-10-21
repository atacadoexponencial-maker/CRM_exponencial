# B32-06: Variação por UF, 25 meses e aprovação visual

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Visão Geral
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Fecham a Visão Geral os dois últimos blocos: a tabela "Variação em relação ao ano anterior" por UF do contato (clientes, crescimento de clientes, vendas, crescimento de vendas, ticket médio, linha de total, ordenação por coluna, "Sem UF", Exportar Excel, comparação justa D-1) e o gráfico dos últimos 25 meses com a variação contra o mesmo mês do ano anterior, que ignora o filtro de período e segue o de atendente. Com a aba completa, a Marcelle aprova a tela em produção, no computador e no celular. Depende da B32-02 (UF) e da B32-03.

## Pronto quando

Na empresa de teste, com vendas semeadas em meses e UFs diferentes, a tabela por UF mostra os crescimentos certos e exporta; o gráfico vai do mês de dois anos atrás até o atual, com a variação de cada mês. A Marcelle abre /relatorios em produção e aprova os blocos na ordem da spec, legíveis no tema escuro.

## Critérios de aceite

- **CA-B32-19** (automática) — Linhas por UF com crescimento. Dado neste período 2 clientes de "PE" faturando R$ 1.000 e, no mesmo período do ano passado, 1 cliente de "PE" faturando R$ 800, quando a tabela é calculada, então a linha PE mostra clientes 2, crescimento de clientes +100,00%, vendas R$ 1.000,00, crescimento de vendas +25,00% e ticket médio R$ 500,00; o total repete os mesmos números.
- **CA-B32-20** (automática) — Exportar a variação por UF. Dado a tabela com 2 UFs, quando o usuário clica em Exportar Excel, então baixa uma planilha com as 2 linhas, a linha de total e as mesmas colunas.
- **CA-B32-21** (automática) — 25 meses com variação anual. Dado hoje é 21/10/2026, com R$ 500 em Out/2025 e R$ 600 em Out/2026 até o dia 20, quando o gráfico é calculado, então ele vai de Out/2024 a Out/2026, com 25 meses, e Out/2026 mostra R$ 600,00 com variação +20,0%.
- **CA-B32-23** (manual) — A Visão Geral aprovada pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11" com vendas semeadas em meses diferentes, quando a Marcelle abre `/relatorios` em produção, no computador e no celular, então os blocos aparecem na ordem da spec, legíveis no tema escuro, e os números batem com as vendas semeadas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-05 | A tabela "Variação em relação ao ano anterior" do Tailor é por região; no CRM ela agrupa pela cidade do contato, que é o que existe. | invalidada | O contato ganha o campo UF e a tabela agrupa por UF, como no Tailor. Marcelle, 21/10/2026 |
| SUP-B32-08 | O gráfico de 25 meses e a projeção seguem o filtro de atendente; só ignoram o de período. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-01 | O comparativo "vs ano passado" compara com o mesmo mês do ano anterior (Out/2025 contra Out/2026). Confirma? A alternativa seria o acumulado do ano. | respondida | Sim, mesmo mês do ano anterior. Marcelle, 21/10/2026 |

## Cenários

### Happy Path
1. A ação `buscarVisaoGeral` devolve também `porUf` (variação por UF) e `mesesHistorico` (25 meses).
2. "Variação em relação ao ano anterior": uma linha por UF do contato com clientes positivados, crescimento de clientes, vendas (faturamento líquido), crescimento de vendas e ticket médio por cliente, contra o mesmo recorte do ano anterior (comparação justa D-1 quando o mês atual está incluído, com o aviso no bloco), linha de total, ordenação por coluna ao clicar no título e botão "Exportar Excel" (`GET /relatorios/variacao-por-uf/exportar?...`).
3. "Valor vendido ao longo do tempo": 25 barras, do mês de dois anos atrás ao atual, com a linha da variação contra o mesmo mês do ano anterior; o mês atual conta só até ontem. Ignora o período; segue o atendente.
4. A Marcelle abre a tela em produção, no computador e no celular, e aprova (CA-B32-23).

### Edge Cases
- Contato sem UF: linha "Sem UF".
- Sem base no ano anterior (zero clientes ou zero vendas): crescimento "—".
- Os 12 primeiros meses do gráfico de 25 não têm mês anterior na janela, mas a variação usa as vendas de fora da janela quando existem; sem venda na base, "—".
- Dia 1º: o mês atual no gráfico de 25 meses fica zerado (nada até ontem) e a tabela por UF fica sem comparativos, como os cartões.

### Cenário de Erro
- Rota de exportação: 400 para período inválido, 401 sem sessão (igual à B32-05).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-19 | automática | `src/test/relatorios-uf-e-historico.test.tsx` | Linha PE com clientes 2, +100,00%, R$ 1.000, +25,00%, ticket R$ 500, e o total igual; "Sem UF" para contato sem UF; clicar no título ordena |
| CA-B32-20 | automática | `src/test/relatorios-uf-exportar.integration.test.ts` | A rota baixa a planilha com as 2 UFs, a linha de total e as mesmas colunas |
| CA-B32-21 | automática | `src/test/relatorios-uf-e-historico.test.tsx` | De Out/2024 a Out/2026, 25 meses, Out/2026 com R$ 600 e +20,0% |
| CA-B32-23 | manual | roteiro abaixo | Blocos na ordem da spec, legíveis no tema escuro, números batendo com as vendas semeadas |

### Roteiro manual — CA-B32-23
1. Entrar na "[TESTE] Automações B11" (vendas de 25 meses semeadas em 21/10/2026) e abrir Relatórios, no computador e no celular.
2. Conferir a ordem: abas, cabeçalho com atalhos, filtros, dez cartões, Vendas diárias, Projeção (só em "Este mês"), Forma de pagamento, Vendas, Variação por UF, Valor vendido ao longo do tempo.
3. Conferir que balões, legendas, tabela e rótulos estão legíveis no tema escuro e que o total da tabela por UF bate com o cartão "Faturamento líquido" quando o período é um mês fechado.

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `variacaoPorUf` e `historicoDe25Meses`, com os tipos.
- **Modificar:** `src/lib/relatorios/exportar-vendas.ts` — colunas da planilha de variação por UF e o nome do arquivo.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — devolve `porUf` e `mesesHistorico`; `buscarVariacaoPorUf` para a rota.
- **Criar:** `src/app/(auth)/relatorios/variacao-por-uf/exportar/route.ts` — GET que baixa a planilha.
- **Criar:** `src/app/(auth)/relatorios/components/variacao-por-uf.tsx` — tabela ordenável com total e Exportar Excel.
- **Criar:** `src/app/(auth)/relatorios/components/grafico-25-meses.tsx` — barras + linha da variação.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — os dois blocos no fim.
- **Modificar:** `src/test/relatorios-tela.test.tsx` — o `visao()` de apoio ganha os dois campos.
- **Modificar:** `src/test/relatorios-graficos.test.tsx` — o `montar()` de apoio ganha os dois campos.
- **Criar:** `src/test/relatorios-uf-e-historico.test.tsx` — CA-B32-19 e CA-B32-21.
- **Criar:** `src/test/relatorios-uf-exportar.integration.test.ts` — CA-B32-20.

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Lib: variação por UF (comparação justa) e 25 meses
- [x] Ação e rota de exportação da variação por UF
- [x] Tabela por UF ordenável com total e gráfico de 25 meses na tela
- [x] Testes automáticos passando; roteiro manual do CA-B32-23 registrado
