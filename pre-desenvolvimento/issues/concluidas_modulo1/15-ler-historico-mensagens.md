# 15: Carregar Histórico de Mensagens

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o carregamento do histórico completo de mensagens de uma conversa em ordem cronológica, buscando do Supabase e exibindo balões diferenciados (enviadas à direita, recebidas à esquerda, notas internas com cor diferente).

## Cenários

### Happy Path
1. Usuário abre o chat e vê a lista de conversas
2. Clica em uma conversa
3. O painel exibe um spinner enquanto as mensagens são carregadas
4. As mensagens aparecem em ordem cronológica (mais antigas no topo, mais recentes embaixo)
5. A área de mensagens faz scroll automático para a mais recente
6. Mensagens enviadas aparecem à direita (balão primário), recebidas à esquerda (balão muted), notas internas centralizadas com fundo âmbar

### Edge Cases
- Conversa sem mensagens: exibe "Nenhuma mensagem ainda" (já tratado em `PainelConversa`)
- Usuário clica em outra conversa enquanto a anterior ainda carrega: o fetch anterior é ignorado e o novo é exibido
- Conversa com muitas mensagens: scroll automático para o final funciona após todas carregadas

### Cenário de Erro
- Falha no Supabase: exibe mensagem "Erro ao carregar mensagens" no lugar dos balões; usuário pode tentar novamente (sem botão de retry nesta issue — apenas mensagem de erro)

## Banco de Dados

- Tabela: `messages`
  - `id` (uuid, pk) — identificador único da mensagem
  - `conversation_id` (uuid, fk → conversations) — conversa à qual pertence
  - `workspace_id` (uuid, fk → workspaces) — para RLS sem join extra
  - `direction` (text) — `'enviada'` ou `'recebida'`
  - `type` (text) — `'texto'` | `'imagem'` | `'audio'` | `'video'` | `'documento'` | `'nota_interna'`
  - `content` (text) — conteúdo da mensagem (texto ou nome do arquivo)
  - `status` (text, nullable) — `'enviado'` | `'entregue'` | `'lido'` | `'falhou'` (null para recebidas e notas)
  - `reply_to_id` (uuid, nullable, fk → messages self) — mensagem citada
  - `reply_preview_text` (text, nullable) — texto da mensagem citada (desnormalizado)
  - `created_at` (timestamptz) — data/hora de envio

## Arquivos

- **Criar:** `supabase/migrations/20260503000000_create_messages.sql` — tabela `messages` com RLS para membros do workspace
- **Criar:** `src/app/(auth)/chat/actions.ts` — Server Action `buscarMensagens(conversaId)` que faz SELECT no Supabase e retorna `Mensagem[]`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — remover prop `mensagens`, chamar `buscarMensagens` ao selecionar conversa, gerenciar estado de loading/erro
- **Modificar:** `src/app/(auth)/chat/page.tsx` — remover import de `MOCK_MENSAGENS` e remoção da prop `mensagens` passada ao `ChatLayout`

## Checklist

- [x] Criar migration `20260503000000_create_messages.sql` com tabela `messages` e RLS
- [x] Criar `src/app/(auth)/chat/actions.ts` com Server Action `buscarMensagens(conversaId: string): Promise<Mensagem[]>`
- [x] Mapear colunas do banco (`direction`, `type`, `content`, `created_at`, `status`, `reply_to_id`, `reply_preview_text`) para o tipo `Mensagem` de `mock-mensagens.ts`
- [x] Formatar `created_at` para `HH:MM` (horário pt-BR)
- [x] Modificar `ChatLayout`: remover prop `mensagens`, ao clicar numa conversa chamar `buscarMensagens`, exibir spinner enquanto carrega, exibir erro se falhar
- [x] Modificar `page.tsx`: remover `MOCK_MENSAGENS` e atualizar props de `ChatLayout`
- [x] Testar: conversa com mensagens, conversa sem mensagens, erro de fetch
