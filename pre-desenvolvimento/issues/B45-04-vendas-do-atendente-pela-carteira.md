# B45-04: Vendas do atendente pela carteira nos Relatórios e no Dashboard, e aprovação

**Tipo:** Implementação
**Página:** Relatórios (Visão Geral, Coorte, Funil de clientes); Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

As vendas do atendente passam a ser as vendas dos clientes da carteira dele, qualquer que seja o vendedor registrado na venda. Vale para a Visão Geral, a Coorte, o Funil de clientes e o Dashboard, para o Atendente e para o Admin que filtra por atendente. Por ser a última entrega da série, leva também a aprovação manual das telas do atendente em produção.

## Pronto quando

Na empresa de teste, o Atendente Teste abre a Visão Geral e o Dashboard e vê as vendas dos clientes da carteira dele, e o Admin, filtrando pelo Atendente Teste, vê os mesmos números. A Marcelle aprova em produção as telas do atendente.

## Critérios de aceite

- **CA-B45-16** (automática) — Visão Geral do atendente soma as vendas dos clientes dele. Dado a Ana, do Atendente Teste, com uma venda de R$ 500 em outubro registrada com o Admin como vendedor, e a Carla, do Bruno, com uma venda de R$ 300 registrada com o Atendente Teste como vendedor, quando o Atendente Teste abre Relatórios → Visão Geral em outubro, então o faturamento é R$ 500 e a tabela de vendas mostra só a venda da Ana
- **CA-B45-17** (automática) — Admin filtrando por atendente vê o mesmo número. Dado as mesmas vendas do critério anterior, quando o Admin abre a Visão Geral, a Coorte e o Funil de clientes filtrados pelo Atendente Teste, então os números são os mesmos que o Atendente Teste vê nas próprias telas
- **CA-B45-18** (automática) — Dashboard do atendente usa a mesma regra. Dado as mesmas vendas, quando o Atendente Teste abre o Dashboard, então as vendas e o faturamento contam a venda da Ana e não a da Carla
- **CA-B45-19** (manual) — Telas do atendente coerentes em produção. Dado a empresa "[TESTE] Automações B11" em produção, depois da mudança, quando a Marcelle entra como o Atendente Teste e abre Contatos, um perfil, o Chat, Relatórios (Visão Geral, RFV, Coorte, Funil de clientes) e o Dashboard, então os 5 clientes da carteira dele aparecem em Contatos, junto com o Luan e os sem dono; o RFV mostra os mesmos 5; a Visão Geral mostra as vendas deles; e todo contato aberto tem card na Entrada

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-03 | O Dashboard segue a mesma regra de vendas da Visão Geral (CA-B45-18) | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-06 | As vendas do atendente nos Relatórios são as dos clientes dele ou as que ele registrou? | respondida | As dos clientes da carteira dele. Marcelle, 27/10/2026 |

## Cenários

### Happy Path
1. O Atendente Teste abre Relatórios → Visão Geral: as vendas são as dos contatos cujo dono é ele (`contacts.atendente_id`), qualquer que seja o vendedor registrado. A tabela de vendas continua mostrando o vendedor registrado em cada linha.
2. O Admin filtra a Visão Geral, a Coorte, o Funil de clientes (e as vendas por campo) pelo Atendente Teste: vê os mesmos números, porque todos passam por `carregarVendas`.
3. O Dashboard do Atendente Teste e o Dashboard do Admin filtrado por ele contam as mesmas vendas. A performance por vendedor passa a somar as vendas da carteira de cada um.

### Edge Cases
- Venda de contato sem dono: não conta para nenhum atendente; conta só no total da empresa (Admin sem filtro).
- Venda registrada por um atendente para cliente de outro: conta para o dono do cliente.
- O contato muda de dono: as vendas antigas dele passam a contar para o novo dono (a carteira é a de hoje).
- Contato na lixeira: as vendas continuam fora, como hoje.

### Cenário de Erro
- Se a leitura da carteira falhar, a lista fica vazia (nenhuma venda para o atendente), como hoje acontece com os cards; nada de dado de outro atendente aparece.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B45-16 | automática | `src/test/vendas-pela-carteira.integration.test.ts` | `buscarVisaoGeral` do Atendente Teste em outubro dá faturamento R$ 500 e a tabela tem só a venda da Ana |
| CA-B45-17 | automática | `src/test/vendas-pela-carteira.integration.test.ts` | Visão Geral, Coorte e Funil de clientes do Admin filtrados pelo Atendente Teste são iguais aos do Atendente Teste |
| CA-B45-18 | automática | `src/test/vendas-pela-carteira.integration.test.ts` | `buscarMetricasDashboard` do Atendente Teste conta a venda da Ana (R$ 500) e não a da Carla |
| CA-B45-19 | manual | roteiro abaixo | As telas do atendente coerentes em produção |

### Roteiro manual — CA-B45-19
1. Em https://crm-exponencial.vercel.app, entrar como `atendente-teste-b11@example.com` (senha em `B11_TESTE_ATENDENTE_SENHA`).
2. Abrir Contatos: aparecem os 5 clientes da carteira dele (Teste B11 Carla, Ana, Dash Risco 1, Dash Risco 2 e Dash Catalogo 1) e o Luan Dias. Contatos de outro atendente não aparecem.
3. Abrir o perfil de um deles: abre, com o card no Funil de Entrada (ou em outro funil).
4. Abrir o Chat: aparecem as conversas dele e as sem responsável.
5. Abrir Relatórios → RFV: os mesmos 5 clientes.
6. Abrir Relatórios → Visão Geral, Coorte e Funil de clientes: as vendas são as desses clientes.
7. Abrir o Dashboard: as vendas e o faturamento batem com a Visão Geral do mesmo período.

## Arquivos

- **Modificar:** `src/lib/metricas-dashboard.ts` — `compraEhDoAtendente` passa a ser "o contato da compra está na carteira do atendente" (o vendedor da venda deixa de decidir)
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `carregarVendas` monta a carteira por `contacts.atendente_id`, não mais pelos cards
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — `carregarDados` monta a carteira por `contacts.atendente_id`
- **Criar:** `src/test/vendas-pela-carteira.integration.test.ts` — testes dos CA-B45-16, 17 e 18
- **Modificar:** `src/test/dashboard-fonte-unificada.integration.test.ts` — CA-B30-16, 17 e 18 reescritos para a regra da carteira, com a nota de que a B45-04 (PER-B45-06) substituiu a regra da B30-03 (sim da Marcelle em 27/10/2026)
- **Modificar:** `src/test/metricas-dashboard.test.ts` — CA-B30-17 reescrito para a regra da carteira (sim da Marcelle em 27/10/2026)
- **Modificar:** `src/test/relatorios-visao-geral.integration.test.ts` — os contatos do teste ganham dono; os números do CA-B32-05 e 06 não mudam (sim da Marcelle em 27/10/2026)

## Checklist

- [x] `compraEhDoAtendente` pela carteira
- [x] Relatórios: `carregarVendas` pela carteira
- [x] Dashboard: `carregarDados` pela carteira
- [x] Escrever `src/test/vendas-pela-carteira.integration.test.ts`
- [x] Rodar os testes de Dashboard, performance e Relatórios (L-05) e o `tsc` (L-07)
