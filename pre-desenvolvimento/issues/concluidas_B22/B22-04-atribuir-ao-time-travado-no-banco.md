# B22-04: "Atribuir ao time" sem pingue-pongue e sem empilhar leads simultâneos

**Tipo:** Correção
**Página:** Motor de automações; banco (função nova)
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **A6**
**Depende de:** B22-03 (mesmo lote, branch `b22-lote-motor`)

## Descrição

Dois problemas na escolha do atendente do "atribuir ao time":

1. **Pingue-pongue.** A conversa do evento contava como carga de quem já estava
   com ela. Com a regra rodando a cada mensagem, a conversa ia da Ana para o
   Bruno e voltava, a cada mensagem do cliente.
2. **Leads simultâneos no mesmo atendente.** Eventos de contatos diferentes rodam
   em paralelo. O motor lia a carga e só gravava depois, então leads que chegavam
   juntos liam a mesma carga e caíam todos na mesma pessoa.

## Pronto quando

Uma conversa que já está com um membro ativo do time fica com ele. Leads que
chegam ao mesmo tempo saem divididos pela carga.

## Plano (09/10/2026)

### Decisões do Luan (09/10)

| Pergunta | Decisão |
|---|---|
| Conversa já com alguém ativo do time | **Fica com quem está.** A ação não mexe em nada e conta como feita |
| Leads ao mesmo tempo | **Escolha travada no banco**, com uma função nova (migration que só acrescenta, aplicada antes do merge) |

O raciocínio completo está na seção 20 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Função `atribuir_conversa_ao_time(p_workspace_id, p_team_id, p_conversation_id)`**,
  com trava por time (`pg_advisory_xact_lock`): confere se a conversa já é de um
  membro ativo; senão, escolhe o membro ativo com menos conversas abertas (sem
  contar a própria conversa; no empate, pelo nome) e grava a conversa, pondo em
  atendimento a que estava em espera (B22-03). Devolve `(atendente_id, manteve)`.
  Só o service role executa.
- **O card continua no motor**, depois da função, só quando a conversa mudou de
  mãos. O card não entra na carga, então não precisa da trava.
- **Sai do motor** a escolha em TypeScript (`atendenteDoTime`).
- **Tipos do Supabase regerados.** Vieram junto `pode_ver_contato` e
  `pode_ver_conversa`, funções da B21 que ainda não estavam no arquivo.

## Cenários

### Happy Path
- Conversa sem atendente: vai para o membro ativo com menos conversas abertas.
- Seis leads ao mesmo tempo, time de dois: três para cada.

### Edge Cases
- Conversa já com um membro ativo do time: fica com ele (manteve), nada é gravado.
- Conversa com membro desativado ou com alguém de fora do time: vai para um membro ativo.
- Conversa resolvida: troca o atendente e continua resolvida.
- Contato sem conversa aberta: a função só escolhe; o motor passa o card.
- Time de outra empresa: nenhuma escolha.

### Cenário de Erro
- Time sem ninguém ativo: "O time não tem atendente ativo"; nada é gravado.
- Erro na função: "Erro ao gravar no banco"; nada é gravado.
- Chamada pela chave pública (anon): recusada.

## Arquivos

- **Criar:** `supabase/migrations/20261009000001_atribuir_conversa_ao_time.sql` — a função.
- **Modificar:** `src/integrations/supabase/types.ts` — regerado.
- **Modificar:** `src/lib/automacoes/acoes.ts` — `atribuirAoTime`, `passarCardEConcluir`; sai `atendenteDoTime`.
- **Modificar:** `src/test/automacoes-banco-falso.ts` — `rpc`.
- **Modificar:** `src/test/automacoes-acoes.test.ts` — testes do "atribuir ao time" passam a cobrir a ligação com a função.
- **Criar:** `src/test/atribuir-ao-time.integration.test.ts` — a função no banco real.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 20.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — A6 resolvido.

## Checklist

- [x] Migration aplicada no Supabase (só acrescenta a função)
- [x] Motor chama a função e passa o card só quando a conversa mudou de mãos
- [x] Teste de integração com os cenários acima passando (11)
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 20) e A6 marcado no QA
