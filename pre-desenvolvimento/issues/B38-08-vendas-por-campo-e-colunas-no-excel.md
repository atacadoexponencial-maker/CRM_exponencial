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
