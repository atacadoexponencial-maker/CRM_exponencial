# B53-02: "Atribuir ao time" escolhe só Atendentes e leva card e contato junto

**Tipo:** Implementação
**Página:** Automações — atribuir ao time
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O rodízio da ação passa a considerar só Atendentes ativos do time; sem nenhum, a ação falha com motivo; o card e o dono do contato acompanham a pessoa escolhida.

## Pronto quando

Rodar a ação num time com Gerente e Atendente sempre entrega ao Atendente, com card e contato junto.

## Critérios de aceite

- **CA-B53-03** (automática) — Rodízio só entre Atendentes. Dado um time com um Gerente sem conversas e um Atendente com 3 conversas abertas, quando a ação "Atribuir ao time" roda para uma conversa sem dono, então a conversa vai para o Atendente.
- **CA-B53-04** (automática) — Time sem Atendente falha com motivo. Dado um time só com Gerente e Admin, quando a ação "Atribuir ao time" roda, então a conversa não muda de dono e o Histórico mostra a ação com falha e o motivo "O time não tem atendente ativo".
- **CA-B53-05** (automática) — Card e contato acompanham a conversa. Dado uma conversa já com um Atendente do time, e o card e o contato com o Gerente, quando a ação "Atribuir ao time" roda, então a conversa fica com o Atendente e o card e o dono do contato passam para ele.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-02 | O card e o dono do contato acompanham a pessoa escolhida por "Atribuir ao time" (hoje só acompanham quando a conversa muda de dono). | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A automação chega à ação "Atribuir ao time".
2. `atribuirAoTime` (`src/lib/automacoes/acoes.ts`) chama a função `atribuir_conversa_ao_time`.
3. A função considera só os membros do time com papel `atendente` e status `active`: se a conversa já está com um deles, mantém; senão escolhe o de menos conversas abertas e grava a conversa.
4. O motor passa o card principal e o dono do contato (com cards e conversas, `passarContatosPara`) para a pessoa escolhida, **também quando a conversa ficou com quem já estava** (SUP-B53-02).

### Edge Cases
- Conversa com um Gerente ou Admin do time: não conta como "já está com o time"; vai para um Atendente.
- Card e contato já com a pessoa escolhida: nada muda, e o histórico da carteira não ganha linha (o `registrarMudancasDeCarteira` só grava quando o dono muda).
- Contato sem conversa aberta: a função só escolhe; o card e o contato vão para o escolhido, como hoje.

### Cenário de Erro
- Time sem nenhum Atendente ativo (só Gerente e Admin, ou só desativados): a função não devolve linha, a conversa não muda e a ação falha com "O time não tem atendente ativo".
- Time apagado: continua "O time não existe mais".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-03 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | no banco de teste, com um Gerente sem conversas e um Atendente com 3 abertas, a ação dá a conversa sem dono ao Atendente |
| CA-B53-04 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | time só com Gerente e Admin: a ação falha com o motivo "O time não tem atendente ativo" (o que vai ao Histórico) e a conversa continua sem dono |
| CA-B53-05 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | conversa já com o Atendente, card e contato com o Gerente: depois da ação, conversa, card e dono do contato são do Atendente |

## Banco de Dados

- Função `public.atribuir_conversa_ao_time(uuid, uuid, uuid)`: redefinida pela migration nova `supabase/migrations/20261030000001_atribuir_ao_time_so_atendentes.sql`, com `p.role = 'atendente'` nos dois filtros (manter e escolher). Mesma assinatura, mesmas permissões. Aplicada só no banco de teste (`npm run db:teste:push`); a produção (`npx supabase db push --linked`) fica para a Marcelle.

## Arquivos

- **Criar:** `supabase/migrations/20261030000001_atribuir_ao_time_so_atendentes.sql` — a função escolhe só entre Atendentes ativos.
- **Modificar:** `src/lib/automacoes/acoes.ts` — quando a conversa fica com quem já estava, o card e o contato também passam para essa pessoa.
- **Modificar:** `src/test/automacoes-acoes.test.ts` — o caso "conversa já com um membro ativo do time: não mexe em nada" (B22-04) passa a esperar o card com a pessoa, pela SUP-B53-02.
- **Criar:** `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` — testes dos CA-B53-03, 04 e 05 no banco de teste.

## Checklist

- [x] Migration nova com o filtro de papel `atendente`
- [x] Migration aplicada no banco de teste (`npm run db:teste:push`)
- [x] `atribuirAoTime` passa card e contato também quando manteve
- [x] Teste antigo do B22-04 ajustado ao comportamento novo
- [x] Testes dos CA-B53-03, 04 e 05
