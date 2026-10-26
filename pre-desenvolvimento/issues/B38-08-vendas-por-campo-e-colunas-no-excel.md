# B38-08: Tabela "Vendas por campo" e campos nos Excel

**Tipo:** Implementação
**Página:** Relatórios → Visão Geral; Excel do RFV, das Vendas e dos Pedidos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

A Visão Geral ganha a tabela "Vendas por campo", no formato da Variação por UF e com Exportar Excel, e os Excel da lista do RFV, das Vendas e dos Pedidos do catálogo ganham uma coluna por campo personalizado.

## Pronto quando

Escolhendo "Porte", a tabela mostra Grande, Pequeno e "Sem valor" com total igual ao Faturamento líquido, e os três Excel saem com as colunas CNPJ e Porte.

## Critérios de aceite

- **CA-B38-54** (automática) — Tabela de vendas por campo. Dado compras no mês de clientes com Porte "Grande", "Pequeno" e sem Porte, quando o Admin escolhe "Porte" na tabela "Vendas por campo", então a tabela mostra uma linha para Grande, uma para Pequeno e uma para "Sem valor", cada uma com os mesmos números que a Variação por UF mostra para uma UF, e o total bate com o cartão "Faturamento líquido"
- **CA-B38-55** (automática) — Exportar a tabela de vendas por campo. Dado a tabela "Vendas por campo" com o Porte escolhido, quando o Admin clica em Exportar Excel, então o arquivo tem as mesmas linhas e números da tabela
- **CA-B38-56** (automática) — Excel com as colunas dos campos. Dado a empresa com os campos "CNPJ" e "Porte", e clientes com esses campos preenchidos, quando o Admin baixa o Excel da lista do RFV, das Vendas da Visão Geral ou dos Pedidos do catálogo, então cada arquivo tem as colunas "CNPJ" e "Porte", na ordem da empresa, com o valor de cada cliente no formato do tipo, e vazio quando o cliente não tem valor
- **CA-B38-57** (manual) — Aprovação visual nos Relatórios e no Dashboard. Dado os Relatórios e o Dashboard com o filtro por campo e a tabela "Vendas por campo", quando a Marcelle os abre no computador e no celular, nos temas claro e escuro, então ela aprova o filtro e a tabela, sem nada desalinhado, cortado ou ilegível

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-14 | A tabela "Vendas por campo" oferece só campos de Lista de opções, Múltipla escolha e Sim/não. Em Múltipla escolha, a venda de um cliente com duas opções conta nas duas linhas, e a tela avisa que a soma das linhas pode passar do total. | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-11 | O que os campos fazem nos Relatórios e no Dashboard? | respondida | Filtro por campo, tabela de vendas por valor do campo e colunas nos Excel que listam clientes ou vendas. Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. Na Visão Geral, abaixo de "Variação por UF", a tabela "Vendas por campo" pede o campo (só Lista de opções, Múltipla escolha e Sim/não, SUP-B38-14).
2. Escolhido o campo, o servidor agrupa as vendas do período pelo valor do campo do cliente, com a mesma conta da Variação por UF (clientes, crescimento, vendas, ticket médio), mais a linha "Sem valor" e o total.
3. A tabela acompanha o período, o atendente e o filtro por campo da tela. "Exportar Excel" baixa as mesmas linhas.
4. O Excel da lista do RFV, o das Vendas da Visão Geral e o dos Pedidos do catálogo ganham uma coluna por campo personalizado, na ordem da empresa: dinheiro como moeda, número como número, data como data e o resto como o texto que a tela mostra.

### Edge Cases
- Múltipla escolha: a venda de quem tem duas opções conta nas duas linhas, e a tabela avisa que a soma das linhas pode passar do total.
- Empresa sem campo de lista, múltipla escolha ou sim/não: a tabela explica que não há campo para agrupar.
- Pedido sem contato ligado: as colunas dos campos ficam vazias.

### Cenário de Erro
- Campo de outra empresa ou de outro tipo no pedido: o servidor não agrupa e a tabela mostra o erro de carregar.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-54 | automática | `src/test/campos-personalizados-vendas-por-campo.integration.test.ts` | Com o Porte, as linhas são Grande, Pequeno e Sem valor, cada uma com os números que a Variação por UF daria para o mesmo grupo, e o total é o Faturamento líquido |
| CA-B38-55 | automática | `src/test/campos-personalizados-vendas-por-campo.integration.test.ts` | O .xlsx da rota tem as mesmas linhas e números da tabela, com o total |
| CA-B38-56 | automática | `src/test/campos-personalizados-vendas-por-campo.integration.test.ts` | Os .xlsx do RFV, das Vendas e dos Pedidos têm as colunas CNPJ e Porte, com os valores e vazio em quem não tem |
| CA-B38-57 | manual | roteiro abaixo | Filtro por campo e tabela aprovados no computador e no celular, claro e escuro |

### Roteiro manual — CA-B38-57
1. Na empresa de teste, com o campo "Porte" (Lista de opções) preenchido em alguns clientes com compras, abra Relatórios.
2. Na Visão Geral, escolha "Porte: Grande" no filtro por campo: cartões, gráficos e lista mudam. Volte para "Todos os contatos".
3. Na tabela "Vendas por campo", escolha "Porte": confira as linhas, o total e o Exportar Excel.
4. Passe pelas abas RFV, Coorte, Funil de clientes e Carteiras com o filtro, e abra o Dashboard com o filtro.
5. Repita no celular e no tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Arquivos

- **Modificar:** `src/lib/relatorios/visao-geral.ts` — a conta da Variação por UF passa a servir a qualquer agrupamento (`variacaoPorChave`)
- **Modificar:** `src/lib/relatorios/exportar-vendas.ts` — colunas e endereço do Excel de vendas por campo
- **Criar:** `src/lib/relatorios/colunas-dos-campos.ts` — as colunas dos campos personalizados no Excel, no formato de cada tipo
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `buscarVendasPorCampo`
- **Criar:** `src/app/(auth)/relatorios/vendas-por-campo/exportar/route.ts` — Excel da tabela
- **Criar:** `src/app/(auth)/relatorios/components/vendas-por-campo.tsx` — a tabela, a escolha do campo e o aviso da múltipla escolha
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — a tabela abaixo da Variação por UF
- **Modificar:** `src/app/(auth)/relatorios/components/variacao-por-uf.tsx` — título e nome da primeira coluna opcionais, para servir à tabela por campo
- **Modificar:** `src/app/(auth)/relatorios/rfv/exportar/route.ts` — colunas dos campos
- **Modificar:** `src/app/(auth)/relatorios/vendas/exportar/route.ts` — colunas dos campos
- **Modificar:** `src/app/(auth)/catalogo/pedidos/exportar/route.ts` — colunas dos campos nos pedidos
- **Modificar:** `src/app/(auth)/catalogo/pedidos/actions.ts` — o contato de cada pedido, para as colunas
- **Criar:** `src/test/campos-personalizados-vendas-por-campo.integration.test.ts` — critérios no Supabase real

## Checklist

- [x] Conta por agrupamento e `buscarVendasPorCampo`
- [x] Tabela "Vendas por campo" e o Excel dela
- [x] Colunas dos campos nos Excel do RFV, das Vendas e dos Pedidos
- [x] Testes da tabela Prova e os dos relatórios e pedidos que já existem
- [x] `npx tsc --noEmit`
