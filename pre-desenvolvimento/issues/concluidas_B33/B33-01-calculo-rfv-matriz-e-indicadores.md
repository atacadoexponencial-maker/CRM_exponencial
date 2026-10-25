# B33-01: Cálculo RFV, aba, matriz e indicadores por perfil

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba RFV
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-rfv.md`

## Descrição

Nasce o cálculo RFV (notas R por faixas fixas, F e V por quintis de 12 meses, FV e os onze perfis da matriz do Tailor), a aba RFV ativa com o cabeçalho (data de referência e tamanho da base) e o filtro de atendente, a matriz 5 × 5 com quantidade, perfil e percentual de ativos por célula, e a tabela de indicadores por perfil (clientes, sem lembrete 15d+, dias sem compra, média de vendas e valor médio por cliente). O clique na célula ainda não filtra nada (a lista vem na B33-02), mas já marca a célula.

## Pronto quando

Na empresa de teste, abrir Relatórios → RFV mostra a data de hoje, a base com os clientes que compraram, a matriz colorida com os perfis e a tabela de indicadores com os números das vendas semeadas. Logada como Atendente, só os clientes dela.

## Critérios de aceite

- **CA-B33-02** (automática) — Notas e perfil de cada cliente. Dado hoje 21/10/2026 e cinco clientes com última venda há 10, 45, 80, 120 e 200 dias, com 1, 2, 3, 4 e 5 vendas nos 12 meses e valores de R$ 100, R$ 200, R$ 300, R$ 400 e R$ 500, quando o RFV é calculado, então as notas R são 5, 4, 3, 2 e 1, as notas F e V são 1, 2, 3, 4 e 5, os FV são 1, 2, 3, 4 e 5, e os perfis são Clientes Recentes, Potencial Fiel, Precisa de Atenção, Em Risco e Não Perder.
- **CA-B33-03** (automática) — Quem nunca comprou fica fora; quem não comprou em 12 meses tem F e V 1. Dado um contato sem venda, um contato na lixeira com venda e um contato cuja única venda foi há 14 meses, quando o RFV é calculado, então os dois primeiros não entram na base, e o terceiro entra com R 1, F 1, V 1 e perfil Perdido.
- **CA-B33-04** (automática) — Empate recebe a mesma nota. Dado dez clientes, todos com exatamente 2 vendas nos 12 meses, quando a nota de Frequência é calculada, então os dez recebem a mesma nota, 5.
- CA-B33-05 foi revisado em 25/10/2026 e passou para a B33-04 (perfil sempre da empresa toda).
- **CA-B33-06** (automática) — A matriz conta os clientes por célula com o percentual de ativos. Dado três clientes em R 5 / FV 5, dois deles com card em Ativos na Recompra, quando a matriz é desenhada, então a célula R 5 / FV 5 mostra "3", "Campeão" e "67% ativos", e as outras 24 células mostram seus próprios números (zero onde não há cliente).
- **CA-B33-08** (automática) — Indicadores de um perfil. Dado dois clientes Campeão: um com última venda há 10 dias, 4 vendas e R$ 1.000 nos 12 meses e um lembrete criado há 3 dias; outro com última venda há 20 dias, 2 vendas e R$ 500 e nenhum lembrete, quando os indicadores são calculados, então a linha Campeão mostra clientes 2, sem lembrete 15d+ "1 (50%)", dias sem compra 15, média de vendas 3,0 e valor médio R$ 750,00.
- **CA-B33-09** (automática) — Perfil sem cliente mostra zeros. Dado nenhum cliente no perfil Hibernando, quando a tabela é desenhada, então a linha Hibernando aparece com 0 clientes e "—" nas médias.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B33-01 | "Ticket médio" da tabela de indicadores do Tailor vira "Valor médio por cliente (12 meses)": o faturamento líquido do perfil dividido pelos clientes dele. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-02 | "Sem tarefa 15d+" do Tailor vira "Sem lembrete 15d+": cliente sem lembrete da Agenda criado nos últimos 15 dias, pendente ou feito. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-03 | "% ativos" da matriz usa o card do funil de Recompra em Onboarding, Reposição ou Ativos, a mesma régua do Dashboard. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-05 | A aba RFV não tem filtro de período: a data de referência é sempre hoje. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O usuário clica na aba "RFV". A tela guarda a aba ativa; a Visão Geral some e o componente do RFV chama `buscarRfv({ atendenteId })`.
2. A ação carrega as vendas da empresa (mesma função da Visão Geral, agora com o atendente do contato), os contatos com card da Recompra em etapa ativa e os contatos com lembrete criado nos últimos 15 dias, e chama `calcularRfv` com hoje como referência.
3. A aba mostra o cabeçalho ("Perfis em 21/10/2026 · 312 clientes com compra"), a matriz 5 × 5 colorida e a tabela de indicadores por perfil.
4. Trocar o atendente no filtro da tela recarrega o RFV só com os clientes dele.

### Edge Cases
- Base vazia: cabeçalho com "0 clientes com compra", matriz toda zerada, indicadores com "—".
- Empates nos quintis recebem a mesma nota, a maior; valor zero (sem venda em 12 meses) é nota 1.
- Clique numa célula marca a célula (anel) e desmarca ao clicar de novo; o filtro da lista chega na B33-02.
- O Atendente: a ação ignora o `atendenteId` pedido e usa o dele; a RLS já limita vendas, cards e lembretes aos contatos dele.

### Cenário de Erro
- Ação devolve nulo: "Não foi possível carregar o RFV. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B33-02 | automática | `src/test/relatorios-rfv.test.tsx` | Notas R, F, V, FV e perfis dos cinco clientes do exemplo |
| CA-B33-03 | automática | `src/test/relatorios-rfv.integration.test.ts` | Contato sem venda e contato na lixeira ficam fora da base; venda única há 14 meses dá R 1, F 1, V 1, Perdido |
| CA-B33-04 | automática | `src/test/relatorios-rfv.test.tsx` | Dez clientes com 2 vendas recebem nota 5 |
| CA-B33-06 | automática | `src/test/relatorios-rfv.test.tsx` | Célula R 5 / FV 5 com 3, "Campeão" e "67% ativos"; 25 células no total |
| CA-B33-08 | automática | `src/test/relatorios-rfv.test.tsx` | Linha Campeão: 2, "1 (50%)", 15 dias, 3,0 e R$ 750,00 |
| CA-B33-09 | automática | `src/test/relatorios-rfv.test.tsx` | Linha Hibernando com 0 e "—" |

## Banco de Dados

Não se aplica: lê `contact_purchases`, `contacts`, `pipeline_cards` e `reminders`.

## Arquivos

- **Criar:** `src/lib/relatorios/rfv.ts` — perfis, matriz, notas (faixas de R, quintis de F e V), clientes, matriz e indicadores. Puro.
- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `VendaRow` ganha `contato_atendente_nome`.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `carregarVendas` traz o atendente do contato; `buscarRfv` (ativos, lembretes recentes, cálculo).
- **Criar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — cabeçalho, matriz e indicadores.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — aba RFV ativa; a Visão Geral e o RFV alternam pela aba; o filtro de atendente vale para as duas.
- **Modificar:** `src/test/relatorios-tela.test.tsx` — o CA-B32-24 passa a esperar três abas futuras (RFV deixou de ser "em breve").
- **Criar:** `src/test/relatorios-rfv.test.tsx` — testes puros e de tela da tabela Prova.
- **Criar:** `src/test/relatorios-rfv.integration.test.ts` — CA-B33-03 e CA-B33-05.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Lib pura do RFV com os onze perfis e a matriz do Tailor
- [x] Ação `buscarRfv` com ativos, lembretes recentes e a regra do atendente
- [x] Aba RFV com cabeçalho, matriz clicável e indicadores
- [x] Testes passando
