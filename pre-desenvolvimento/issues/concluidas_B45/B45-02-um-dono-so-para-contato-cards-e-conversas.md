# B45-02: Um dono só para contato, cards e conversas

**Tipo:** Implementação
**Página:** Chat (atribuir e transferir); Funil (atendente do card); Relatórios → Carteiras; Automações (ação "atribuir atendente")
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

O dono do contato (a carteira) passa a ser o mesmo atendente dos cards e das conversas desse contato. Atribuir em qualquer lugar (no Chat, no card, em Relatórios → Carteiras ou por automação) muda os três juntos, e a troca entra no histórico de carteira. Os contatos que hoje têm dono num lugar e outro atendente em outro ficam alinhados.

## Pronto quando

Na empresa de teste, o Admin atribui no Chat a conversa do Luan ao Atendente Teste, e o perfil do Luan, os cards dele e o histórico em Relatórios → Carteiras passam a mostrar o Atendente Teste. O mesmo vale ao trocar o atendente num card, mexer na carteira ou rodar a automação. Nenhum contato tem a conversa com um atendente e a carteira com outro.

## Critérios de aceite

- **CA-B45-06** (automática) — Atribuir a conversa no Chat faz do atendente o dono do contato. Dado o contato "Luan", sem dono, com um card na Entrada e um na Recompra, e a conversa sem responsável, quando o Admin atribui a conversa ao Atendente Teste no Chat, então o Luan passa a ser do Atendente Teste: o perfil mostra o Atendente Teste como atendente, os dois cards mostram o mesmo atendente, e o histórico de carteira registra a troca
- **CA-B45-07** (automática) — Transferir a conversa leva o contato junto. Dado o contato "Luan", do Atendente Teste, com a conversa com ele, quando o Atendente Teste transfere a conversa para o colega Bruno, então o Luan, os cards dele e a conversa passam a ser do Bruno, e o histórico de carteira registra a troca
- **CA-B45-08** (automática) — Atribuir no card leva os outros cards e a conversa junto. Dado o contato "Ana", com um card na Entrada, um na Recompra e a conversa com o Bruno, quando o Admin escolhe o Atendente Teste como atendente do card da Entrada, então a Ana, o card da Recompra e a conversa passam a ser do Atendente Teste
- **CA-B45-09** (automática) — Mudar a carteira leva os cards e as conversas junto. Dado a Ana e o Luan, do Bruno, cada um com card e conversa com o Bruno, quando o Admin transfere a carteira do Bruno para o Atendente Teste em Relatórios → Carteiras, então os cards e as conversas da Ana e do Luan passam a ser do Atendente Teste; e quando o Admin remove a Ana da carteira, ela, os cards e a conversa dela ficam sem dono
- **CA-B45-10** (automática) — Automação que atribui atendente leva a conversa junto. Dado uma automação com a ação "atribuir atendente: Atendente Teste" e o contato "Ana", com a conversa com o Bruno, quando a automação roda para a Ana, então a Ana, os cards dela e a conversa passam a ser do Atendente Teste
- **CA-B45-11** (automática) — Contatos antigos ficam com um dono só. Dado o contato "Luan", sem dono, com a conversa com o Atendente Teste, e o contato "Ana", do Bruno, com a conversa com o Atendente Teste, quando a mudança entra no ar, então o Luan passa a ser do Atendente Teste, e a conversa da Ana passa para o Bruno, que é o dono dela

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-01 | Nos contatos que hoje têm dono num lugar e outro atendente na conversa, vale o dono do contato (a carteira), e a conversa passa para ele (CA-B45-11). Contato sem dono que tem conversa com alguém passa a ser de quem está na conversa | confirmada | Marcelle, 27/10/2026 ("pode ser, são só testes") |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-01 | O que é o dono do contato? | respondida | Um dono só para lead e cliente (a carteira), e "o atendente é dono do que está atribuído a ele". Marcelle, 27/10/2026 |
| PER-B45-02 | Atribuir ou transferir a conversa no Chat muda o dono do contato? | respondida | Sim, tudo junto: conversa, cards e dono do contato. Marcelle, 27/10/2026 |
| PER-B45-10 | Na arrumação dos dados antigos, contato sem dono e sem conversa com ninguém, mas com card que tem atendente: quem vira o dono? | respondida | O atendente do card (com dois cards de atendentes diferentes, o card mais recente). Marcelle, 27/10/2026 |
| PER-B45-11 | As trocas de dono feitas pela arrumação dos dados antigos entram no histórico de carteira? | respondida | Não entram: é arrumação da base. Marcelle, 27/10/2026 |

## Cenários

### Happy Path
1. O Admin atribui no Chat a conversa do Luan ao Atendente Teste. A conversa muda de responsável como hoje e, junto, o Luan, os cards dele (Entrada e Recompra) e as outras conversas dele passam para o Atendente Teste. O histórico de carteira ganha a linha "pelo chat", com o Admin como quem fez.
2. O atendente transfere a conversa para um colega do time (as checagens de hoje continuam). Contato, cards e conversas passam para o colega, e o histórico registra "pelo chat" com o atendente como quem fez.
3. O Admin escolhe o atendente num card. Os outros cards e as conversas do contato vão junto (hoje só o card e o contato mudavam).
4. Transferir, remover ou distribuir carteira em Relatórios → Carteiras passa também as conversas dos contatos (hoje só contato e cards). Remover deixa contato, cards e conversas sem dono.
5. A automação "atribuir atendente" (e "atribuir ao time") passa, além da conversa do evento e do card principal, todos os cards e todas as conversas do contato.
6. Na publicação, a migration alinha os dados antigos: contato sem dono ganha como dono quem está na conversa mais recente com responsável; sem isso, o atendente do card mais recente com atendente. Depois, todos os cards e conversas de cada contato ficam com o dono do contato. Sem linha no histórico.

### Edge Cases
- Atribuir a conversa à mesma pessoa que já é a dona: nada muda e o histórico não ganha linha (o `registrarMudancasDeCarteira` já ignora "de" igual a "para").
- Contato com conversas em dois números (B7): todas passam para o novo dono.
- Conversa resolvida também passa para o novo dono; o status de cada conversa não muda (só a conversa atribuída no Chat ou na automação passa de "em espera" para "em atendimento", como hoje).
- Contato na lixeira: as ações de Carteiras já ignoram; as demais só chegam a ele por conversa ou card que o usuário consegue abrir.
- Atendente transferindo: a troca de responsável é bloqueada pelo banco para atendente (B21-01), então a troca do contato, dos cards e das conversas é gravada pelo servidor com a chave de serviço, depois das checagens de hoje.

### Cenário de Erro
- Se a gravação do contato, dos cards ou das conversas falhar no Chat ou no card, a ação lança o erro de hoje ("Erro ao atribuir atendente") e a tela mostra a falha.
- Em Carteiras, a falha devolve as mensagens de hoje ("Não foi possível transferir/remover. Tente novamente.").
- Na automação, a falha entra no resultado como "erro no banco", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B45-06 | automática | `src/test/dono-do-contato.integration.test.ts` | Depois de `atribuirConversa` pelo Admin, o Luan, os cards da Entrada e da Recompra têm o Atendente Teste, e o histórico tem a troca (de ninguém para o Atendente Teste, "pelo_chat") |
| CA-B45-07 | automática | `src/test/dono-do-contato.integration.test.ts` | Depois de `transferirConversa` pelo Atendente Teste para o Bruno, o Luan, os cards e a conversa são do Bruno, e o histórico tem a troca do Atendente Teste para o Bruno |
| CA-B45-08 | automática | `src/test/dono-do-contato.integration.test.ts` | Depois de `atribuirAtendente` no card da Entrada, a Ana, o card da Recompra e a conversa são do Atendente Teste |
| CA-B45-09 | automática | `src/test/dono-do-contato.integration.test.ts` | Depois de `transferirCarteira` do Bruno para o Atendente Teste, os cards e as conversas da Ana e do Luan são do Atendente Teste; depois de remover a Ana da carteira, ela, os cards e a conversa ficam sem dono |
| CA-B45-10 | automática | `src/test/dono-do-contato.integration.test.ts` | Depois de `executarAcao` com "atribuir atendente: Atendente Teste" para a Ana, ela, os cards e a conversa são do Atendente Teste |
| CA-B45-11 | automática | `src/test/dono-do-contato.integration.test.ts` | A função de alinhamento, rodada na empresa do teste, faz do Atendente Teste o dono do Luan (pela conversa) e passa a conversa da Ana para o Bruno, dono dela |

## Banco de Dados

- Migration `supabase/migrations/20261027000012_um_dono_so.sql`:
  - `carteira_historico.motivo` aceita também `pelo_chat` (troca do check).
  - Função `public.alinhar_donos_dos_contatos(p_workspace_id uuid) returns integer`: contato sem dono ganha o responsável da conversa mais recente com responsável, ou o atendente do card mais recente com atendente; depois, cards e conversas de cada contato ficam com o dono do contato (`is distinct from`). Devolve quantos contatos mudaram. `security definer`, `search_path = public`, EXECUTE só para `service_role`.
  - No fim, roda a função para cada empresa.

## Arquivos

- **Modificar:** `src/lib/carteira.ts` — novo motivo `pelo_chat` (e rótulo "pelo chat"); nova `passarContatosPara(supabase, { workspaceId, contactIds, para, motivo, por })`: lê o dono atual de cada contato, grava o novo dono no contato, em todos os cards e em todas as conversas dele, e registra no histórico com `registrarMudancasDeCarteira`
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `atribuirConversa` e `transferirConversa` chamam `passarContatosPara` com o contato da conversa (motivo `pelo_chat`); na transferência pelo atendente, com a chave de serviço
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `atribuirAtendente` troca a gravação do contato e do histórico por `passarContatosPara`
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `mudarCarteira` e `aplicarDonos` trocam as gravações de contato, cards e histórico por `passarContatosPara`
- **Modificar:** `src/lib/automacoes/acoes.ts` — `passarCardEConcluir` troca a gravação do contato e do histórico por `passarContatosPara`
- **Criar:** `supabase/migrations/20261027000012_um_dono_so.sql` — motivo `pelo_chat` e alinhamento dos dados antigos
- **Criar:** `src/test/dono-do-contato.integration.test.ts` — testes dos CA-B45-06 a 11
- **Modificar:** `src/test/automacoes-acoes.test.ts` — três testes antigos (B11-08, B22-03, B22-04) passam a conferir que só o responsável das conversas do contato muda, em vez de "nenhuma gravação em conversa" (regra nova; sim da Marcelle em 27/10/2026)
- **Modificar:** `src/test/automacoes-atribuir-contato.test.ts` — o contato é conferido pela lista de ids (sim da Marcelle em 27/10/2026)

## Checklist

- [x] `passarContatosPara` e o motivo `pelo_chat` em `src/lib/carteira.ts`
- [x] Chat: atribuir e transferir passam contato, cards e conversas
- [x] Card: `atribuirAtendente` usa `passarContatosPara`
- [x] Carteiras: transferir, remover e distribuir usam `passarContatosPara`
- [x] Automação: `passarCardEConcluir` usa `passarContatosPara`
- [x] Migration com `pelo_chat` e `alinhar_donos_dos_contatos`, aplicada com `npx supabase db push --linked`
- [x] Escrever `src/test/dono-do-contato.integration.test.ts`
- [x] Rodar os testes de carteira, chat, pipeline e automações que usam essas actions (L-05) e o `tsc` (L-07)
