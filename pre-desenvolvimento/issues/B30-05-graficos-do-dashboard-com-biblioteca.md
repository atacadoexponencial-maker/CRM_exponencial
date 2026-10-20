# B30-05: Gráficos do dashboard com a biblioteca dos relatórios

**Tipo:** Implementação
**Página:** Dashboard
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

O donut de distribuição da base e o funil de etapas do dashboard, hoje desenhos próprios
sem interação, passam a ser desenhados pela biblioteca de gráficos escolhida para os
relatórios, com nome e valor ao passar o mouse e legenda. Os números não mudam: os dados
entregues ao gráfico são os mesmos de antes. É a prova de que a biblioteca funciona no
tema escuro do CRM antes de as telas de relatório a usarem.

Não depende das outras issues da série.

## Pronto quando

No dashboard com dados, passar o mouse numa fatia do donut ou numa barra do funil mostra o
nome e o valor; os totais são os mesmos de antes da mudança; tudo legível no tema escuro,
sem texto branco em fundo branco.

## Critérios de aceite

- **CA-B30-19** (manual) — Gráficos do dashboard com interação e sem mudar os números. Dado o dashboard com dados, quando a Marcelle passa o mouse nas fatias do donut e nas barras do funil, então aparece o nome e o valor de cada parte; os totais são os mesmos de antes; o gráfico é legível no tema escuro, sem texto branco em fundo branco.
- **CA-B30-20** (automática) — Dados do gráfico continuam iguais. Dado o mesmo conjunto de cards e compras, quando o dashboard calcula a distribuição da base e o funil de etapas, então os valores entregues ao gráfico são os mesmos que a versão anterior entregava.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
