# B33-04: Perfil RFV sempre da empresa toda; o filtro de atendente só mostra a carteira

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba RFV
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-rfv.md` (revisão de 25/10/2026)

## Descrição

No teste manual (CA-B33-16), o mesmo cliente mudava de perfil conforme o filtro de atendente, porque os quintis de F e V eram calculados só com os clientes do atendente. Agora o RFV é sempre calculado com a empresa inteira, a mesma régua da lista de contatos, do chat e das automações (`perfis_rfv_da_empresa`). O filtro de atendente (Admin e Gerente) e o papel Atendente só escolhem quais clientes aparecem: os da carteira, ou seja, os contatos que têm aquele atendente como atendente do contato. Matriz, indicadores, lista, Excel e evolução contam só esses clientes. A evolução segue a carteira de hoje.

## Pronto quando

Na empresa de teste, o mesmo cliente tem as mesmas notas e o mesmo perfil com e sem o filtro de atendente; filtrando pelo Atendente Teste aparecem só os 5 clientes da carteira dele; logado como o Atendente Teste, a aba mostra os mesmos 5, com os mesmos perfis.

## Critérios de aceite

- **CA-B33-05** (automática) — Atendente vê só a carteira dele, com o perfil da empresa. Dado clientes com compra nas carteiras de dois atendentes, Ana e Bruno, e um cliente da carteira da Ana que também comprou com o Bruno, quando a Ana, com papel Atendente, abre a aba RFV, então a base, a matriz, os indicadores e a lista só têm os clientes da carteira dela, inclusive esse cliente, e as notas R, F, V, FV e o perfil de cada um são os mesmos que o Admin vê sem filtro.
- **CA-B33-17** (automática) — O filtro de atendente só esconde, não recalcula. Dado a empresa com clientes nas carteiras da Ana e do Bruno, quando o Admin abre a aba RFV sem filtro e depois filtra pela Ana, então com o filtro aparecem só os clientes da carteira da Ana, cada um com as mesmas notas e o mesmo perfil de sem filtro; a base, a matriz e os indicadores contam só esses clientes; o Excel baixa só eles.
- **CA-B33-18** (automática) — A evolução com filtro segue a carteira de hoje. Dado um cliente da carteira da Ana que era Campeão há três semanas e hoje é Clientes Fiéis, pelo cálculo da empresa toda, e um cliente do Bruno, quando o Admin filtra pela Ana e olha a evolução semanal, então as colunas contam só o cliente da Ana, com os perfis que ele tinha na empresa em cada data (Campeão na S40, Clientes Fiéis na S43), e o cliente do Bruno não aparece em nenhuma coluna.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B33-07 | O Atendente vê as notas calculadas com a empresa toda (a posição do cliente dele frente aos outros), mas nenhum dado de cliente fora da carteira: nome, valores e quantidade de clientes dos outros não chegam à tela dele. | confirmada | Marcelle, 25/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. `buscarRfv({ atendenteId })` resolve quem filtra como hoje: o Atendente é sempre ele mesmo; Admin e Gerente usam o filtro da tela ou nenhum.
2. As vendas da empresa inteira, os cards ativos da Recompra e os lembretes dos últimos 15 dias são lidos no servidor com o cliente de serviço, sempre com `workspace_id` da sessão (a RLS do Atendente só deixaria ler a carteira dele, e a régua precisa da empresa toda).
3. Com filtro, a ação lê os contatos da carteira (`contacts.atendente_id = atendenteId`, mesma empresa, fora da lixeira).
4. `calcularRfv` calcula as notas de todos os clientes da empresa e, havendo carteira, devolve só os dela: base, matriz e indicadores contam só esses; a evolução calcula cada data com a empresa toda e conta só os da carteira.
5. O Excel (`/relatorios/rfv/exportar`) já usa `buscarRfv` e herda o recorte.

### Edge Cases
- Carteira vazia ou sem cliente com compra: base 0, matriz zerada, indicadores com "—", evolução zerada.
- Cliente que comprou com o Bruno mas está na carteira da Ana: aparece só no filtro da Ana, com todas as compras dele contando nas notas.
- Cliente sem atendente: aparece só sem filtro.
- Sessão inválida: devolve nulo antes de ler qualquer coisa com o cliente de serviço.

### Cenário de Erro
- Ação devolve nulo: a tela mostra "Não foi possível carregar o RFV. Tente novamente." (já existe).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B33-05 | automática | `src/test/relatorios-rfv.integration.test.ts` | Logada como Ana (Atendente), `buscarRfv` devolve só a carteira dela, com R/F/V/FV/perfil iguais aos do Admin sem filtro; nenhum contato do Bruno em base, matriz, indicadores ou evolução |
| CA-B33-17 | automática | `src/test/relatorios-rfv.integration.test.ts` | Admin com e sem filtro: mesmas notas por cliente; base, matriz e indicadores só da carteira; o Excel filtrado traz só a carteira |
| CA-B33-18 | automática | `src/test/relatorios-rfv-evolucao.test.tsx` | `calcularRfv` com carteira: evolução semanal conta só o cliente da Ana, Campeão na S40 e Fiéis na S43, pelo cálculo da empresa toda |

## Banco de Dados

Não se aplica: lê `contact_purchases`, `contacts`, `pipeline_cards` e `reminders`. Nenhuma migration.

## Arquivos

- **Modificar:** `src/lib/relatorios/rfv.ts` — `calcularRfv` aceita a carteira (conjunto de contatos) e recorta clientes, matriz, indicadores e evolução depois de calcular com a empresa toda.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — leitura das vendas separada da sessão (recebe o cliente); `buscarRfv` lê a empresa toda com o cliente de serviço e a carteira do atendente.
- **Modificar:** `src/test/relatorios-rfv.integration.test.ts` — CA-B33-05 reescrito e CA-B33-17.
- **Modificar:** `src/test/relatorios-rfv-evolucao.test.tsx` — CA-B33-18.
- **Modificar:** `src/test/filtro-contatos-rfv.integration.test.ts` — o CA-B42-22 esperava a diferença antiga (Potencial Fiel na aba RFV da atendente); agora espera o mesmo perfil da empresa, e A e A2 ganham a Carla como atendente do contato. Incluído com a aprovação da Marcelle em 25/10/2026.

## Checklist

- [x] `calcularRfv` com carteira opcional (sem carteira, resultado igual ao de hoje)
- [x] `buscarRfv` com a empresa toda pelo cliente de serviço e a carteira do atendente
- [x] Testes CA-B33-05, CA-B33-17 e CA-B33-18
- [x] Auditor da B33-04
