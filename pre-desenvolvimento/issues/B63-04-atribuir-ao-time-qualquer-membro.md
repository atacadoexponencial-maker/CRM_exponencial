# B63-04: "Atribuir ao time" escolhe qualquer membro

**Tipo:** Implementação
**Página:** Automações (ação "Atribuir ao time")
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

A ação "Atribuir ao time" volta a escolher entre todos os membros ativos do time, de
qualquer cargo (desfaz a B53-02). Continua: menos conversas abertas recebe, empate pelo
nome, conversa já com um membro ativo do time fica com ele. Time sem membro ativo
falha com "O time não tem membro ativo".

## Pronto quando

Um time com a Nathália e a Vivianne distribui leads entre as duas, pela carga.

## Critérios de aceite

- **CA-B63-16** (automática) — O Admin do time pode receber o lead. Dado um time com a atendente Ana (3 conversas abertas) e o Admin (1 conversa aberta), os dois ativos, quando "Atribuir ao time" roda para um lead novo, então o lead vai para o Admin.
- **CA-B63-17** (automática) — Conversa já com um Gerente do time fica com ele. Dado um time com a Ana e um Gerente, e uma conversa que já é do Gerente, quando "Atribuir ao time" roda para essa conversa, então ela continua com o Gerente, e a execução registra que manteve o dono.
- **CA-B63-18** (automática) — Time sem ninguém ativo avisa a falha. Dado um time cujos membros estão todos desativados, quando "Atribuir ao time" roda, então a conversa não muda de dono, e a execução da automação mostra "O time não tem membro ativo".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-03 | "Atribuir ao time" escolhe qualquer membro ativo do time, de qualquer cargo. | confirmada | Luan, 19/11/2026 |
| SUP-B63-09 | "A execução registra que manteve o dono" (CA-B63-17) é o que a função `atribuir_conversa_ao_time` devolve (`manteve: true`), como nos testes da B22-04; a ação do motor continua sem guardar detalhe no sucesso, que hoje só registra o motivo das falhas. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A automação roda "Atribuir ao time" para uma conversa.
2. A função `atribuir_conversa_ao_time`, travada por time, procura entre os membros ativos do time, de qualquer cargo.
3. Conversa já com um membro ativo do time: fica com ele (`manteve: true`), sem gravar a conversa.
4. Senão, vai para o membro com menos conversas abertas; no empate, o primeiro pelo nome.
5. O card e o contato acompanham a pessoa escolhida (B45-02), como antes.

### Edge Cases
- Membro desativado não recebe, de nenhum cargo.
- Conversa com alguém de fora do time, ou com membro desativado: é redistribuída.

### Cenário de Erro
- Time sem membro ativo: a conversa não muda e a execução mostra "O time não tem membro ativo".
- Time apagado: "O time não existe mais" (B22-27, sem mudança).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B63-16 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | com a atendente em 3 conversas abertas e o Admin em 1, o lead novo vai para o Admin |
| CA-B63-17 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | a conversa do Gerente do time continua com ele, e a função devolve `manteve: true` |
| CA-B63-18 | automática | `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` | com todos os membros desativados, a conversa continua sem dono e a execução falha com "O time não tem membro ativo" |

## Banco de Dados

- Função `atribuir_conversa_ao_time` reescrita: sai o filtro `p.role = 'atendente'` nas duas consultas

## Arquivos

- **Criar:** `supabase/migrations/20261119000002_atribuir_ao_time_qualquer_membro.sql` — a função sem o filtro de cargo
- **Modificar:** `src/lib/automacoes/acoes.ts` — o motivo da falha passa a "O time não tem membro ativo" e os comentários da B53-02
- **Modificar:** `src/test/atribuir-ao-time-so-atendentes.integration.test.ts` — os critérios da B53-02 que a B63-04 desfaz (CA-B53-03 e 04) dão lugar a CA-B63-16, 17 e 18; o CA-B53-05 continua
- **Modificar:** `src/test/automacoes-acoes.test.ts` — o motivo novo da falha

## Checklist

- [x] Conferir a lista de migrations do banco de teste antes de numerar
- [x] Migration e `npm run db:teste:push`
- [x] Motivo da falha e comentários em `acoes.ts`
- [x] Testes CA-B63-16 a 18 e ajuste dos testes da B53-02
- [x] Rodar os testes de "Atribuir ao time" (`atribuir-ao-time`, `automacoes-acoes`, `automacoes-atribuir-contato`)
- [x] `npx tsc --noEmit` e lint
