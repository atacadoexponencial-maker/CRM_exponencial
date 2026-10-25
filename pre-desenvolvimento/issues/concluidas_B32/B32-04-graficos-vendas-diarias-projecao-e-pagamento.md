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

## Cenários

### Happy Path
1. A ação `buscarVisaoGeral` passa a devolver também `graficos`: vendas diárias, projeção e forma de pagamento, calculados pela lib pura sobre as mesmas vendas dos cartões.
2. Abaixo dos cartões, três cartões de gráfico (Recharts, padrão da B30-05): "Vendas diárias" (barras do valor por dia; linhas de peças e de ticket médio por venda no eixo da direita), "Projeção de vendas — mês atual" (barras do realizado por dia até ontem, linha projetada daí em diante, total projetado em destaque) e "Forma de pagamento" (barras horizontais, maior para menor, valor e percentual).
3. Passar o mouse num dia mostra, no balão escuro, o dia, o valor vendido, as peças e o ticket médio.

### Edge Cases
- Dia sem venda: barra zero, continua no eixo (CA-B32-11).
- Período de vários meses: o gráfico diário mostra todos os dias do intervalo.
- Projeção só com o período "Este mês" (um mês = o mês de hoje). "Ontem", "Mês anterior" e vários meses: bloco ausente (CA-B32-14).
- Dia 1º: não há realizado até ontem; a média diária é zero e o bloco mostra "Sem vendas ainda este mês".
- Venda sem forma de pagamento entra em "Não informada". Sem venda nenhuma, o bloco de pagamento mostra "Sem vendas no período".
- Projeção e gráficos seguem o filtro de atendente (SUP-B32-08), porque usam as mesmas vendas filtradas.

### Cenário de Erro
- Nenhum novo: a ação já trata sessão ausente; a lib é pura.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-11 | automática | `src/test/relatorios-graficos.test.tsx` | `vendasDiarias` para Outubro/2026 tem 31 dias, com valor, peças e ticket nos dias 3 e 17 e zero nos demais |
| CA-B32-12 | manual | roteiro abaixo | Balão do dia com valor, peças e ticket, legível no tema escuro |
| CA-B32-13 | automática | `src/test/relatorios-graficos.test.tsx` | Hoje 11/10 com R$ 1.000 de 1º a 10: média R$ 100, 21 dias restantes projetam R$ 2.100 e o total é R$ 3.100 |
| CA-B32-14 | automática | `src/test/relatorios-graficos.test.tsx` | Com "Mês anterior" a lib devolve projeção nula e a tela não desenha o bloco |
| CA-B32-18 | automática | `src/test/relatorios-graficos.test.tsx` | Pix R$ 300 (60,0%), Boleto R$ 100 (20,0%), Não informada R$ 100 (20,0%), nessa ordem |

### Roteiro manual — CA-B32-12
1. Entrar na "[TESTE] Automações B11" (já tem vendas semeadas) e abrir Relatórios.
2. Passar o mouse numa barra de "Vendas diárias": aparece o balão com o dia, o valor vendido, as peças e o ticket médio.
3. Conferir que o balão e os rótulos dos eixos estão legíveis no tema escuro.

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `vendasDiarias`, `projecaoDoMes`, `faturamentoPorForma` e `calcularGraficos`, com os tipos.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — seleciona `forma_pagamento` e devolve `graficos`.
- **Modificar:** `src/app/(auth)/dashboard/components/graficos.tsx` — exporta o `Balao` do tema escuro para os relatórios reutilizarem.
- **Criar:** `src/app/(auth)/relatorios/components/graficos-visao-geral.tsx` — os três gráficos com Recharts.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — desenha os gráficos abaixo dos cartões.
- **Modificar:** `src/test/relatorios-tela.test.tsx` — o `visao()` de apoio ganha `graficos` (o tipo mudou).
- **Criar:** `src/test/relatorios-graficos.test.tsx` — testes da tabela Prova.

## Dependências Externas

- `recharts` — já instalado (B30-05).

## Checklist

- [x] Lib: vendas diárias, projeção e forma de pagamento
- [x] Ação devolve os gráficos
- [x] Três gráficos na tela, com balão escuro, projeção só no mês atual
- [x] Testes automáticos passando; roteiro manual do CA-B32-12 registrado

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B32-12 | Marcelle | 25/10/2026 |
