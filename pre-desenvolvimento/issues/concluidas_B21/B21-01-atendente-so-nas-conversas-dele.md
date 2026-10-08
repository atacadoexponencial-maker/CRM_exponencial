# B21-01: Atendente só alcança as conversas dele

**Tipo:** Implementação
**Página:** Chat (caixa de entrada e conversa)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 1 (parte do chat)

## Descrição

A regra "Atendente só vê e age nas conversas em que é responsável", que hoje só existe no
filtro da caixa de entrada, passa a valer no banco e em todas as ações do chat: conversas,
mensagens, etiquetas da conversa, responsável e contato da conversa.

## Pronto quando

Entrando como atendente de teste, o chat funciona como hoje nas conversas dele (responder,
mídia, etiquetas, mensagem rápida, tempo real); e testes automatizados provam que, com a
sessão do atendente, o banco não devolve conversas nem mensagens de colegas, e que gravar
mensagem falsa em conversa de colega, trocar o responsável ou trocar o contato de uma
conversa é recusado — pelo CRM e direto no banco. Admin e Gerente seguem vendo todas.

## Cenários

> Levantamento de 08/10: no banco, `conversations` tem SELECT e UPDATE liberados para a
> empresa toda; `messages` tem SELECT e INSERT liberados para a empresa toda;
> `conversation_labels` libera tudo para a empresa. O filtro `assigned_to = userId` só
> existe na lista (`chat/conversas.ts:47`). O tempo real manda o **texto** de toda
> mensagem nova para `workspace:<id>`, que qualquer membro (inclusive atendente) ouve.
> `postgres_changes` já respeita o SELECT da RLS — fechando a RLS, ele fecha junto.
> Os motores (webhook, gateway, automações, sequências, campanhas, lixeira) usam service
> role e não são afetados.

### Happy Path
1. Atendente abre `/chat`: vê só as conversas em que `assigned_to = ele` (como hoje).
2. Responde texto, imagem, documento, vídeo e áudio; o insert em `messages` e o update da
   prévia em `conversations` passam pela RLS porque a conversa é dele.
3. Aplica e remove etiqueta, resolve, reabre e marca como lida: passa pela RLS.
4. Mensagem nova chega: o servidor transmite em `workspace:<id>:gestao` (Admin/Gerente) e
   em `usuario:<assigned_to>` (o responsável). A conversa aberta do atendente recebe na hora.
5. Atendente transfere conversa **dele** para colega do mesmo time: a action confere que a
   conversa é dele e que o colega é do time, e grava com service role (o banco não deixa o
   atendente trocar `assigned_to` diretamente).
6. Admin/Gerente: veem, respondem, atribuem e transferem tudo da empresa, como hoje.

### Edge Cases
- **Conversa sem responsável:** invisível para atendente (premissa da spec), inclusive no
  tempo real (só vai para `:gestao`).
- **Reatribuição:** depois que Admin/Gerente passam a conversa para outro, o antigo
  deixa de ler pela RLS; o tempo real das próximas mensagens vai para o novo.
- **Contato com card do atendente, mas conversa de outro (ou sem responsável):** no perfil
  do contato, na agenda e no funil o link para a conversa some para ele (RLS). Na central
  de alertas, a "última atividade" do card continua sendo calculada (busca só
  `last_message_at` com service role, filtrada pela empresa e pelos contatos dos cards que
  ele já vê) — para o alerta "sem resposta" não mudar de comportamento.
- **Mensagem gravada pelo servidor** (webhook, gateway, automação, sequência): segue
  gravando com service role.
- **Contato na lixeira:** as regras de lixeira atuais continuam somadas às novas.

### Cenário de Erro
- Atendente chama action com conversa de colega (enviar, etiquetar, resolver, reabrir,
  marcar lida, buscar mensagens): o banco não acha a conversa → "Conversa não encontrada"
  ou o erro genérico que já existe; nada é gravado.
- Atendente tenta transferir conversa que não é dele: "Sem permissão para transferir
  conversa".
- Direto no banco com a sessão do atendente: SELECT volta vazio; INSERT de mensagem e
  UPDATE de conversa de colega são recusados; UPDATE de `contact_id`, `workspace_id` ou
  `whatsapp_connection_id` é recusado para qualquer usuário (só service role muda);
  UPDATE que troca `assigned_to` é recusado para atendente.

## Banco de Dados

Migration nova (sem coluna nova):

- Função `public.pode_ver_conversa(p_conversation_id uuid) returns boolean` — `security
  definer`, `stable`, mesmo estilo de `conversa_na_lixeira`: verdadeiro se a conversa é
  da empresa de `get_auth_user_workspace_id()` e o perfil ativo é admin/gerente ou é o
  `assigned_to`.
- `conversations`:
  - policy SELECT "Membros veem conversas do próprio workspace" → empresa + fora da
    lixeira + (admin/gerente ou `assigned_to = auth.uid()`).
  - policy UPDATE "Membros atualizam conversas do próprio workspace" → `using` igual ao
    SELECT; `with check` empresa + (admin/gerente ou `assigned_to = auth.uid()`).
  - trigger `before update` `conversas_campos_protegidos`: para quem não é service role,
    recusa mudança em `contact_id`, `workspace_id`, `whatsapp_connection_id`; para
    atendente, recusa mudança em `assigned_to`.
- `messages`:
  - policy SELECT → empresa + fora da lixeira + `pode_ver_conversa(conversation_id)`.
  - policy INSERT → `with check` empresa + `pode_ver_conversa(conversation_id)`.
- `conversation_labels`: policies SELECT e ALL → etiqueta da empresa +
  `pode_ver_conversa(conversation_id)`.
- `realtime.messages`: policy nova de SELECT para os tópicos
  `workspace:<id>:gestao` (perfil ativo admin/gerente da empresa) e `usuario:<auth.uid()>`.
  A policy de `workspace:<id>` fica (eventos de lixeira e `postgres_changes`).

Ordem de publicação: código (tempo real em dois tópicos + transferir com service role +
alertas) no ar **antes** do `npx supabase db push --linked`.

## Arquivos

- **Criar:** `supabase/migrations/20261008000001_tempo_real_por_responsavel.sql` — policy dos tópicos novos do tempo real. Separada na execução: só acrescenta e precisa ir ao banco **antes** do código.
- **Criar:** `supabase/migrations/20261008000002_atendente_so_nas_conversas_dele.sql` — função, policies e trigger. Vai ao banco **depois** do código.
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `transmitirMensagem` descobre o `assigned_to` da conversa (service client) e transmite `nova_mensagem` em `workspace:<id>:gestao` e, se houver responsável, em `usuario:<assigned_to>`. Assinatura pública não muda (webhook e `recebimento.ts` seguem iguais).
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — `nova_mensagem` passa a ser ouvido num segundo canal privado: `workspace:<id>:gestao` para admin/gerente, `usuario:<userId>` para atendente.
- **Modificar:** `src/app/(auth)/chat/page.tsx` — só se for preciso passar `userId` ao `ChatLayout`.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `transferirConversa`: para atendente, conferir que a conversa é dele (`assigned_to = user.id`) e gravar a troca com `createServiceClient()` filtrando por `workspace_id`; `atribuirConversa`: conferir que o atendente-alvo é da mesma empresa.
- **Modificar:** `src/app/(auth)/alertas/actions.ts` — `last_message_at` por contato via service client (filtrado por `workspace_id` e pelos `contactIds` dos cards visíveis); o `conversaId` do link continua vindo do cliente do usuário.
- **Criar:** `src/test/atendente-conversas-seguranca.integration.test.ts` — ataques recusados direto no banco e pelas actions.
- **Modificar:** `src/test/tempo-real-seguranca.integration.test.ts` — passa a cobrir os tópicos `:gestao` e `usuario:<id>`.
- **Modificar:** `src/test/chat-tempo-real-credencial.test.tsx` — dois canais e o tópico de cada papel.
- **Modificar:** `src/test/usuario-desativado-seguranca.integration.test.ts` — (achado na execução) o controle lia conversa sem responsável com sessão de atendente; a conversa passa a ser dele.

Reutilizar: `sessaoAtual` (`@/lib/sessao`), `createServiceClient` (`@/integrations/supabase/service`), `get_auth_user_workspace_id()` e o estilo de `conversa_na_lixeira` (migration `20261002000004`).

## Dependências Externas

Nenhuma nova. Tópicos privados com policy em `realtime.messages`: padrão do Supabase Realtime Authorization, já usado na B19-04.

## Checklist

- [x] Migrations com `pode_ver_conversa`, policies de `conversations`/`messages`/`conversation_labels`, trigger de campos protegidos e policy dos tópicos novos
- [x] `transmitirMensagem` em dois tópicos (`:gestao` e `usuario:<id>`)
- [x] `chat-layout` ouvindo `nova_mensagem` no tópico certo por papel
- [x] `transferirConversa` (atendente) com checagem de dono e gravação por service role; `atribuirConversa` checando a empresa do alvo
- [x] Alertas com última atividade por service client
- [x] Testes (8 passando contra o banco em 08/10): atendente não lê conversa/mensagem/etiqueta de colega no banco; não insere mensagem em conversa de colega; não troca `assigned_to` nem `contact_id`; actions recusam conversa alheia; transferência legítima funciona; admin/gerente veem tudo
- [x] Teste do tempo real: atendente recebe só da conversa dele; gerente recebe todas; outra empresa nada
- [x] Build, lint e testes do chat passando
- [x] Migration 1 (tempo real) aplicada em 08/10
- [x] Código no ar (cec64d5), depois migration 2 aplicada em 08/10
