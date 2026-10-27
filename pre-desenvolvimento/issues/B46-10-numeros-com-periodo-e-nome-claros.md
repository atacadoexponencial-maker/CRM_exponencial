# B46-10: Números com período à vista e nomes que não se confundem

**Tipo:** Correção
**Página:** Dashboard e Relatórios (Visão Geral e Carteiras)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-07** e **M-08**
**Gravidade:** Médio

## Descrição

"Leads" é 46 no Pipeline e 2 nas Carteiras, com definições diferentes. O faturamento do Dashboard (30 dias) e o dos Relatórios (mês) diferem sem que a tela mostre o período. Espera a resposta da PER-B46-02.

## Pronto quando

Cada cartão de faturamento mostra o período, e os contatos sem compra das Carteiras têm nome próprio.

## Critérios de aceite

- **CA-B46-24** (automática) — Cartões de faturamento dizem o período. Dado o Dashboard em "30 dias" e os Relatórios em "mês", quando os cartões de faturamento são desenhados, então cada um mostra a data inicial e a final ("01/10 a 27/10")
- **CA-B46-25** (automática) — "Leads" das Carteiras com outro nome. Dado a aba Carteiras dos Relatórios, quando os totais são desenhados, então o número de contatos sem compra não se chama "Leads", e sim o nome da PER-B46-02

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-02 | Que nome dar aos contatos sem compra nas Carteiras, para não confundir com os "Leads" do Pipeline? Sugestão: "Sem compra" (B46-10) | aberta | |
