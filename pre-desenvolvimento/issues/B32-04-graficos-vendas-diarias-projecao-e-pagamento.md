# B32-04: Gráficos de vendas diárias, projeção do mês e forma de pagamento

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Visão Geral
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Abaixo dos cartões entram três blocos com o padrão de gráfico da B30-05: vendas diárias (barras do valor por dia, linhas de peças e ticket médio por venda), projeção do mês atual (realizado por dia e linha projetada pela média diária, com o total projetado em destaque; só aparece no mês atual) e faturamento por forma de pagamento (barras horizontais com valor e percentual, "Não informada" para venda sem forma). Os três seguem os filtros da tela; a projeção ignora o de período. Depende da B32-03.

## Pronto quando

Na empresa de teste, a Visão Geral do mês atual mostra os três gráficos com os números das vendas semeadas; passar o mouse num dia mostra valor, peças e ticket. Escolher "Mês anterior" esconde a projeção.

## Critérios de aceite

- **CA-B32-11** (automática) — Um ponto por dia do período. Dado o período Outubro de 2026 com vendas nos dias 3 e 17, quando o gráfico é calculado, então ele tem 31 dias no eixo, com valor, peças e ticket preenchidos nos dias 3 e 17 e zero nos demais.
- **CA-B32-12** (manual) — Balão do dia. Dado o gráfico com dados, quando a Marcelle passa o mouse numa barra, então aparece o dia, o valor vendido, as peças e o ticket médio, legíveis no tema escuro.
- **CA-B32-13** (automática) — Projeção pela média diária. Dado hoje é 11/10/2026 e o realizado de 1º a 10 soma R$ 1.000,00, quando a projeção é calculada, então a média diária é R$ 100,00, os 21 dias restantes projetam R$ 2.100,00 e o total projetado do mês é R$ 3.100,00.
- **CA-B32-14** (automática) — Projeção só no mês atual. Dado o usuário escolhe "Mês anterior", quando a tela recarrega, então o bloco de projeção não aparece.
- **CA-B32-18** (automática) — Faturamento por forma de pagamento. Dado vendas de R$ 300 em Pix, R$ 100 em Boleto e R$ 100 sem forma de pagamento, quando o bloco é calculado, então ele lista Pix R$ 300,00 (60,0%), Boleto R$ 100,00 (20,0%) e Não informada R$ 100,00 (20,0%), nessa ordem.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-04 | A projeção do mês é o realizado até ontem mais a média diária simples (realizado ÷ dias passados) vezes os dias que faltam, contando hoje. Sem distinguir dia útil de fim de semana. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-08 | O gráfico de 25 meses e a projeção seguem o filtro de atendente; só ignoram o de período. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
