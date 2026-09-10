# 14: Nova Conversa de Número Desconhecido Aparece como "Em Espera"

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar a lógica de recepção de mensagem de número não cadastrado: a conversa é criada automaticamente com status "Em espera" e aparece na lista de todos os Admin e Gerentes do workspace.

Esta issue também cria o schema de `contacts` e `conversations` — base para todas as issues de chat reais a partir daqui — e substitui o mock data da caixa de entrada por dados reais do Supabase.

## Cenários

### Happy Path
1. Meta WhatsApp API envia POST para `/api/webhooks/whatsapp` com mensagem de número desconhecido
2. Webhook encontra o `whatsapp_connection` pelo `phone_number_id` do payload
3. Contato não existe → cria `contact` com `phone_number` e `name = null`
4. Conversa não existe para esse contato → cria `conversation` com `status = 'em_espera'`, `assigned_to = null`
5. A conversa aparece na caixa de entrada de Admins e Gerentes com status "Em espera" e badge de não lidas

### Edge Cases
- Contato já existe (número já contatou antes): reutiliza o contato, cria nova conversa se não houver conversa aberta (`status != 'resolvida'`)
- Conversa já existe e está em aberto (`em_espera` ou `em_atendimento`): não cria nova conversa, apenas atualiza `last_message_text`, `last_message_at` e incrementa `unread_count`
- Webhook recebe payload sem campo `messages` (ex.: status updates): retorna 200 sem processar
- `phone_number_id` do payload não corresponde a nenhum `whatsapp_connection`: retorna 200 sem processar

### Cenário de Erro
- Falha ao criar contato/conversa no banco: retorna 500 (Meta vai reenviar)
- `WHATSAPP_VERIFY_TOKEN` ausente no ambiente: GET de verificação retorna 403

## Banco de Dados

- Tabela: `contacts`
  - `id` (uuid, PK)
  - `workspace_id` (uuid, FK workspaces)
  - `phone_number` (text) — número no formato E.164 (`+5511999999999`)
  - `name` (text, nullable) — null até ser nomeado pelo usuário
  - `created_at` (timestamptz)
  - UNIQUE (workspace_id, phone_number)

- Tabela: `conversations`
  - `id` (uuid, PK)
  - `workspace_id` (uuid, FK workspaces)
  - `contact_id` (uuid, FK contacts)
  - `status` (text) — `'em_espera'` | `'em_atendimento'` | `'resolvida'`; default `'em_espera'`
  - `assigned_to` (uuid, FK profiles, nullable)
  - `unread_count` (integer) — default 0
  - `last_message_text` (text) — default `''`
  - `last_message_at` (timestamptz) — default `now()`
  - `created_at` (timestamptz)

## Arquivos

- **Criar:** `supabase/migrations/20260501000000_create_contacts.sql` — tabela contacts + RLS (workspace members podem SELECT; service role faz INSERT/UPDATE)
- **Criar:** `supabase/migrations/20260501000001_create_conversations.sql` — tabela conversations + RLS (workspace members podem SELECT; service role faz INSERT/UPDATE)
- **Criar:** `src/integrations/supabase/service.ts` — cliente Supabase com service role key (para uso exclusivo em rotas de API sem sessão de usuário)
- **Criar:** `src/app/api/webhooks/whatsapp/route.ts` — GET (verificação do webhook Meta) + POST (recepção de mensagens; cria contato e conversa se necessário)
- **Modificar:** `src/app/(auth)/chat/page.tsx` — substituir `MOCK_CONVERSAS` por query real ao Supabase; mapear resultado para `Conversa[]`; pré-filtrar por papel: Admin/Gerente recebem todas as conversas do workspace, Atendente recebe apenas as atribuídas a si
- **Modificar:** `.env.example` — adicionar `WHATSAPP_VERIFY_TOKEN`

> `src/integrations/supabase/types.ts` é auto-gerado — após rodar as migrations, executar `supabase gen types typescript --linked` para atualizar.

## Dependências Externas

Nenhuma nova. Reutilizar:
- `createServerClient` de `@supabase/ssr` (padrão já usado em `server.ts`)
- `createClient` de `@/integrations/supabase/server` (já usado em `page.tsx`)

## Checklist

- [x] Migration `contacts`: tabela criada com UNIQUE (workspace_id, phone_number) e RLS
- [x] Migration `conversations`: tabela criada com FK para contacts e profiles, e RLS
- [x] `service.ts`: cliente com `SUPABASE_SERVICE_ROLE_KEY` criado sem cookies
- [x] Webhook GET: responde com `hub.challenge` quando `hub.verify_token` bate com `WHATSAPP_VERIFY_TOKEN`
- [x] Webhook POST: encontra `whatsapp_connection` por `phone_number_id`; cria ou reutiliza `contact`; cria ou atualiza `conversation`
- [x] Webhook POST: quando cria nova conversa, `status = 'em_espera'` e `assigned_to = null`
- [x] Webhook POST: quando conversa já existe e está aberta, atualiza `last_message_text`, `last_message_at`, incrementa `unread_count`
- [x] `page.tsx`: query retorna conversas reais do Supabase em ordem decrescente de `last_message_at`
- [x] `page.tsx`: Atendente recebe apenas conversas com `assigned_to = user.id`; Admin/Gerente recebem todas
- [x] `page.tsx`: dados mapeados para `Conversa[]` compatível com `ChatLayout` (etiquetas como array vazio por enquanto)
- [x] `.env.example` atualizado com `WHATSAPP_VERIFY_TOKEN`
