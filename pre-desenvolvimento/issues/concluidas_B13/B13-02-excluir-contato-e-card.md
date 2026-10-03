# B13-02: Excluir lead e contato — some do pipeline, de contatos e do chat

**Tipo:** Implementação
**Página:** Pipeline (painel do card), Contatos (lista e perfil), Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Criar a ida para a lixeira: botão "Excluir" no painel do card, na lista e no perfil do
contato, com o diálogo aprovado na B13-01 (o que vai junto: cards, conversas, mensagens).
Confirmar manda o contato e todos os seus cards para a lixeira — sem apagar nada — e
eles somem na hora do Pipeline (inclusive para outro usuário com o quadro aberto), da
lista e da busca de Contatos e do Chat (caixa de entrada, busca, conversa aberta fecha
com aviso, envio bloqueado). Qualquer papel exclui o que já consegue ver. Registra quem
excluiu e quando.

## Pronto quando

No CRM publicado, excluir o lead de teste "Teste Cliente" pelo painel do card tira ele
do funil, de Contatos e do Chat; um atendente consegue excluir um contato seu e não
consegue excluir o de outro; e nada foi apagado de verdade no banco.

## Cenários

### Happy Path
1. **Pipeline:** no painel do card, "Excluir" busca o resumo (funis com card, conversas,
   mensagens) e abre o `DialogoExcluirContato` com `funilDeOrigem` = funil do quadro.
   Confirmar chama `excluirContatoPorCard(cardId)`; o painel fecha e o quadro recarrega
   (`onMover` já faz `router.refresh()`), sem o card.
2. **Contatos (lista):** ícone de lixeira na linha abre o mesmo diálogo; confirmar chama
   `excluirContato(contactId)` e o contato some da lista.
3. **Perfil:** "Excluir contato" no topo; confirmar exclui e leva para `/contatos`.
4. Excluir grava `contacts.excluido_em = now()` e `excluido_por = usuário`. Nada é apagado.
5. A regra de acesso do banco passa a esconder, para quem usa a sessão do usuário, os
   **cards**, **conversas** e **mensagens** de contato na lixeira. Assim somem do Pipeline,
   do Chat (lista, busca, abrir conversa, enviar — que lê a conversa pela sessão e passa a
   dar "Conversa não encontrada") e de toda tela que lê cards/conversas pela sessão.
6. **Chat aberto em outro navegador:** o servidor transmite `contato_excluido` no tópico
   `workspace:<id>` (mesmo mecanismo do `nova_mensagem`); a caixa de entrada tira as
   conversas daquele contato e, se uma delas estiver aberta, fecha com o aviso "Este
   contato foi excluído".

### Edge Cases
- **Quem pode excluir** (verificado no servidor, nunca na tela): Admin e Gerente, qualquer
  contato da empresa; Atendente, só contato com conversa atribuída a ele ou card em que
  ele é o responsável — a mesma regra de `listarContatos`. Pelo card: se o atendente vê o
  card (o banco já limita), pode excluir.
- A atualização em `contacts` usa o cliente de serviço **depois** da checagem, porque o
  banco só deixa Admin/Gerente alterar contatos e a decisão foi "todos excluem".
- Excluir duas vezes (dois cliques, duas abas): a segunda não muda nada (`excluido_em is
  null` no filtro) e responde sucesso.
- Contato com cards nos dois funis: o diálogo mostra o aviso do outro funil; os dois somem.
- Pipeline não tem tempo real: para outro usuário com o quadro aberto, o card some no
  próximo carregamento (spec ajustada).
- Perfil de contato na lixeira aberto pelo endereço: nesta issue mostra "Contato não
  encontrado" (o aviso com "Restaurar" é da B13-04).
- `verificarNumeroDuplicado` e a criação de lead/contato com telefone de contato na lixeira
  ficam como estão: o tratamento (restaurar) é da B13-05. **Push só depois da B13-05.**
- Agenda, alertas, sequências, campanhas, automações e números que não passam pela sessão
  do usuário são da B13-03.

### Cenário de Erro
- Sem permissão: `{ erro: "Você não pode excluir este contato." }` no diálogo.
- Contato/card não encontrado ou falha do banco: "Não foi possível excluir. Tente de novo."
- Falha ao transmitir `contato_excluido`: não desfaz a exclusão (mesma regra do
  `transmitirMensagem`: nunca derruba quem chamou); o chat dos outros atualiza ao recarregar.

## Banco de Dados

Migration `supabase/migrations/20261002000004_contatos_lixeira.sql`:
- Tabela: `contacts`
  - `excluido_em` (timestamptz, null) — quando foi para a lixeira; null = ativo.
  - `excluido_por` (uuid, null, → `profiles(id)` on delete set null) — quem excluiu.
  - Índice parcial `(workspace_id, excluido_em) where excluido_em is not null` (lixeira).
- Função `public.contato_na_lixeira(uuid) returns boolean` (stable, security definer,
  `search_path = public`).
- Políticas de SELECT recriadas com "e o contato não está na lixeira":
  - `pipeline_cards` — "Cards visíveis por papel" + `not contato_na_lixeira(contact_id)`
  - `conversations` — "Membros veem conversas do próprio workspace" + idem
  - `messages` — "Membros veem mensagens do próprio workspace" + a conversa não é de
    contato na lixeira
- `contacts` continua visível (a lixeira precisa ler); a lista e o perfil filtram no código.
- Aplicar com `npx supabase db push --linked`; regenerar `types.ts`
  (`supabase gen types typescript --linked`).

## Arquivos

- **Criar:** `supabase/migrations/20261002000004_contatos_lixeira.sql`
- **Criar:** `src/app/(auth)/contatos/lixeira/actions.ts` — server actions
  `resumoExclusaoContato(contactId)`, `resumoExclusaoPorCard(cardId)`,
  `excluirContato(contactId)`, `excluirContatoPorCard(cardId)`: checagem de permissão,
  gravação de `excluido_em/por`, transmissão e `revalidatePath` de `/pipeline`,
  `/pipeline/recompra`, `/contatos`, `/chat`.
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `transmitirContatoExcluido(workspaceId,
  contactId)`, no mesmo tópico e formato de envio do `transmitirMensagem`.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — botão "Excluir" e
  diálogo; ao confirmar, `onMover?.()` + `onFechar()`.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — ação "Excluir"
  por linha e diálogo; tira o contato da lista local ao confirmar.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — botão
  "Excluir contato" e diálogo; ao confirmar, `router.push("/contatos")`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `listarContatos` (os três ramos e a
  busca) e o perfil filtram `excluido_em is null`.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — ouvir
  `contato_excluido`: tirar as conversas do contato da lista e fechar a aberta com aviso.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado (não editar à mão).

Reaproveita: `DialogoExcluirContato` (B13-01); `sessaoAtual` de `src/lib/sessao.ts`;
`createServiceClient` de `src/integrations/supabase/service.ts`; o padrão de transmissão
de `src/lib/whatsapp/realtime.ts`; a regra de visibilidade do atendente de `listarContatos`.

## Dependências Externas

- Supabase Realtime Broadcast (já usado em `transmitirMensagem`).
- Postgres RLS — políticas de SELECT com função `security definer`
  (https://supabase.com/docs/guides/database/postgres/row-level-security).

## Checklist

- [x] Migration criada, aplicada (`db push`) e `types.ts` regenerado
- [x] Server actions de resumo e exclusão com checagem de permissão no servidor
- [x] `transmitirContatoExcluido` em `realtime.ts`
- [x] Botão + diálogo no painel do card, na lista e no perfil
- [x] Lista, busca e perfil de contatos ignoram a lixeira
- [x] Chat tira as conversas do contato excluído e fecha a aberta com aviso
- [x] Verificação no banco real com usuários temporários: admin exclui qualquer um;
      atendente exclui o seu e é recusado no de outro; card/conversa/mensagem somem pela
      sessão; `contacts` continua com a linha (nada apagado)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` e testes existentes de
      pipeline/contatos/chat passando — 34/37; as 3 falhas são as antigas do status no webhook (`mensagens.integration`), que falham igual sem esta mudança
- [x] Conferência visual (build local + Playwright, empresas temporárias apagadas): diálogo do card com o aviso do outro funil, card some dos dois funis; perfil → diálogo com 1 conversa/1 mensagem → volta a /contatos; chat em outra aba tira a conversa e mostra "Este contato foi excluído"; lista tira o contato na hora e depois de recarregar
