# B35-01: Aba Carteiras com o painel e o histórico de alterações

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Carteiras; card do funil e automação (gravação do histórico)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-carteiras.md`

## Descrição

Nasce a tabela do histórico de carteira e a aba Carteiras: visão geral da empresa (Total, Com carteira, Sem carteira × Leads, Base, Ativos, Inativos), carteira por vendedor (todos os usuários ativos), a contagem de quem está sem vendedor e a lista das 50 mudanças mais recentes com Atualizar. Atribuir atendente pelo card (tela do funil e automação) passa a gravar no histórico com o motivo "pelo card". O Atendente vê só o próprio cartão. Os botões de ação chegam nas B35-02 e B35-03.

## Pronto quando

Na empresa de teste, Relatórios → Carteiras mostra os números da empresa, um cartão por usuário com os números dele, quantos estão sem vendedor e o histórico; atribuir um card no funil faz aparecer uma linha "ninguém → Ana · pelo card" no histórico.

## Critérios de aceite

- **CA-B35-01** (automática) — A aba Carteiras abre o painel. Dado a tela Relatórios aberta por um Admin, quando ele clica na aba "Carteiras", então a aba fica selecionada e aparecem a visão geral, a carteira por vendedor, o bloco de sem vendedor e o histórico.
- **CA-B35-02** (automática) — Os números da visão geral. Dado 3 leads e 4 clientes com compra, dos quais 1 é ativo; 5 deles têm vendedor (2 leads, 3 da base, o ativo entre eles) e 2 não (1 lead, 1 da base), quando a visão geral é calculada, então Total: leads 3, base 4, ativos 1, inativos 3; Com carteira: 2, 3, 1, 2; Sem carteira: 1, 1, 0, 1.
- **CA-B35-03** (automática) — Carteira por vendedor. Dado a Ana com 2 leads e 3 da base (1 ativo) e o Bruno sem contato, quando os cartões são calculados, então a Ana mostra "5 na carteira", leads 2, base 3, ativos 1, inativos 2, e o Bruno mostra "0 na carteira" com zeros.
- **CA-B35-11** (automática) — O histórico registra toda mudança de carteira. Dado uma transferência feita pelo Admin às 14h03, quando o histórico é consultado, então mostra a linha com data e hora, o nome do contato, "Ana → Bruno", "transferência" e "Admin", as mais recentes primeiro, no máximo 50.
- **CA-B35-12** (automática) — Atribuir pelo card também entra no histórico. Dado um contato sem vendedor, quando a Ana recebe o card dele no funil (ação "Atribuir" do card ou automação), então o histórico ganha "ninguém → Ana · pelo card".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B35-01 | "Vendedor" é qualquer usuário ativo da empresa, inclusive Admin e Gerente, porque a venda já pode ter qualquer um deles como atendente. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-04 | O histórico guarda todas as mudanças numa tabela nova e a aba mostra as 50 mais recentes; sem exportação. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-05 | Atribuir atendente pelo card do funil (tela ou automação) passa a gravar no histórico com o motivo "pelo card". | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O usuário clica na aba "Carteiras"; o componente chama `buscarCarteiras()`, que carrega os contatos (fora da lixeira, com o atendente do contato), quem tem venda, quem tem card ativo na Recompra, os usuários ativos e as 50 linhas mais recentes do histórico, e chama `calcularPainelDeCarteiras`.
2. A aba mostra a visão geral (Total / Com carteira / Sem carteira × Leads, Base, Ativos, Inativos), um cartão por vendedor com "N na carteira" e os quatro números, o bloco "Sem vendedor" com a contagem e o histórico com Atualizar.
3. Atribuir atendente pelo card (tela do funil ou automação) grava "ninguém → Ana · pelo card" no histórico, pela função `registrarMudancasDeCarteira`.

### Edge Cases
- Atendente: a ação devolve só o cartão dele (`papel: "atendente"`, sem visão geral, sem sem-vendedor, sem histórico); a RLS já limita contatos e esconde o histórico.
- Mudança para o mesmo atendente não grava no histórico.
- Automação grava com `alterado_por` nulo (mostra "automação").

### Cenário de Erro
- Ação devolve nulo: "Não foi possível carregar as carteiras. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B35-01 | automática | `src/test/relatorios-carteiras.test.tsx` | Clicar em "Carteiras" como Admin mostra visão geral, carteira por vendedor, sem vendedor e histórico |
| CA-B35-02 | automática | `src/test/relatorios-carteiras.test.tsx` | Total 3/4/1/3, Com carteira 2/3/1/2, Sem carteira 1/1/0/1 |
| CA-B35-03 | automática | `src/test/relatorios-carteiras.test.tsx` | Ana "5 na carteira" com 2/3/1/2 e Bruno "0 na carteira" com zeros |
| CA-B35-11 | automática | `src/test/relatorios-carteiras.integration.test.ts` | Após uma mudança, `buscarCarteiras` traz a linha com data e hora, contato, de, para, motivo e quem fez, mais recente primeiro |
| CA-B35-12 | automática | `src/test/relatorios-carteiras.integration.test.ts` | `atribuirAtendente` do funil grava "ninguém → Ana · pelo card" |

## Banco de Dados

- Tabela nova: `carteira_historico` — `workspace_id`, `contact_id`, `de_atendente_id`, `para_atendente_id`, `motivo` (transferencia, remocao, distribuicao, ultima_venda, pelo_card), `alterado_por` (nulo = automação), `created_at`. RLS: Admin e Gerente da empresa leem e gravam.

## Arquivos

- **Criar:** `supabase/migrations/20261021000008_historico_de_carteira.sql` — a tabela e as políticas.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado.
- **Criar:** `src/lib/carteira.ts` — motivos, `registrarMudancasDeCarteira` e `atendenteDoContato`.
- **Criar:** `src/lib/relatorios/carteiras.ts` — cálculo puro do painel.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `atribuirAtendente` grava "pelo card" no histórico.
- **Modificar:** `src/lib/automacoes/acoes.ts` — a atribuição por automação grava "pelo card" (automação).
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `buscarCarteiras`.
- **Criar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — a aba.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — aba Carteiras ativa; nenhuma aba "em breve".
- **Modificar:** `src/test/relatorios-tela.test.tsx` — CA-B32-24 passa a conferir que não há aba "em breve".
- **Criar:** `src/test/relatorios-carteiras.test.tsx` — CA-B35-01, 02 e 03.
- **Criar:** `src/test/relatorios-carteiras.integration.test.ts` — CA-B35-11 e 12.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Migration aplicada e tipos regenerados
- [x] Histórico gravado pelo card (tela e automação)
- [x] Ação `buscarCarteiras` e aba com os quatro blocos
- [x] Testes passando
