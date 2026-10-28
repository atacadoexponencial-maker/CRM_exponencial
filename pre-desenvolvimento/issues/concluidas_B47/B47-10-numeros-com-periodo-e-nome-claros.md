# B47-10: Números com período à vista e nomes que não se confundem

**Tipo:** Correção
**Página:** Dashboard e Relatórios (Visão Geral e Carteiras)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-07** e **M-08**
**Gravidade:** Médio

## Descrição

"Leads" é 46 no Pipeline e 2 nas Carteiras, com definições diferentes. O faturamento do Dashboard (30 dias) e o dos Relatórios (mês) diferem sem que a tela mostre o período. Decidido na PER-B47-02: "Sem compra".

## Pronto quando

Cada cartão de faturamento mostra o período, e os contatos sem compra das Carteiras têm nome próprio.

## Critérios de aceite

- **CA-B47-24** (automática) — Cartões de faturamento dizem o período. Dado o Dashboard em "30 dias" e os Relatórios em "mês", quando os cartões de faturamento são desenhados, então cada um mostra a data inicial e a final ("01/10 a 27/10")
- **CA-B47-25** (automática) — "Leads" das Carteiras com outro nome. Dado a aba Carteiras dos Relatórios, quando os totais são desenhados, então o número de contatos sem compra não se chama "Leads", e sim "Sem compra"

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B47-02 | Que nome dar aos contatos sem compra nas Carteiras, para não confundir com os "Leads" do Pipeline? Sugestão: "Sem compra" (B47-10) | respondida | "Sem compra". Luan, 27/10/2026 |

## Cenários

### Happy Path
1. No Dashboard em "30 dias", o primeiro número diz "Faturado de 27/09 a 27/10 (N compras)".
2. Nos Relatórios, os cartões "Faturamento bruto" e "Faturamento líquido" dizem, embaixo do título, "01/10 a 27/10" no mês corrente.
3. Nas Carteiras, a coluna que era "Leads" se chama "Sem compra", e o resumo dos sem vendedor diz "N sem compra".

### Edge Cases
- Período "Ontem" nos Relatórios: o mesmo dia nas duas pontas ("26/10 a 26/10").
- Painel do Dashboard sem período (dados antigos em cache): continua "Faturado no período".
- Os "Leads" do Pipeline e o "Novos leads" do Dashboard continuam com o nome: são os cards do funil.

### Cenário de Erro
- Sem consulta nova: o período vem do mesmo cálculo que já filtra os números.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-24 | automática | `src/test/numeros-com-periodo.test.tsx` | `calcularMetricas` devolve o período, o Dashboard mostra "Faturado de 27/09 a 27/10", e os cartões de faturamento dos Relatórios mostram "01/10 a 27/10" |
| CA-B47-25 | automática | `src/test/numeros-com-periodo.test.tsx` | O painel das Carteiras mostra "Sem compra" e nenhum "Leads" |

## Arquivos

- **Modificar:** `src/lib/datas.ts` — `formatarIntervalo` e `formatarIntervaloDoCalendario`.
- **Modificar:** `src/lib/metricas-dashboard.ts` — `periodo` nas métricas.
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — "Faturado de … a …".
- **Modificar:** `src/app/(auth)/relatorios/components/cartoes-resumo.tsx` — período nos cartões de faturamento.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — passa o período aos cartões.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — "Sem compra".
- **Modificar:** `src/test/relatorios-carteiras.test.tsx` — o resumo dos sem vendedor com "sem compra".
- **Criar:** `src/test/numeros-com-periodo.test.tsx` — testes do CA-B47-24 e do CA-B47-25.

## Checklist

- [x] Período no Dashboard e nos Relatórios
- [x] "Sem compra" nas Carteiras
- [x] Testes do CA-B47-24 e do CA-B47-25 e os do Dashboard e dos Relatórios passando (as falhas de tema já existem na master), tsc e lint
