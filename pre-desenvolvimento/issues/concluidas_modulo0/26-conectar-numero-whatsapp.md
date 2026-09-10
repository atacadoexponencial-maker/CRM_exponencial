# 26: Conectar número de WhatsApp

**Tipo:** Implementação
**Página:** Gestão de Números de WhatsApp

## Descrição

Admin inicia o fluxo de conexão via API Oficial do WhatsApp (Meta), conclui a autenticação e o sistema confirma a conexão exibindo o número e seu status. O botão de conectar deve ficar desabilitado quando já há um número conectado.

---

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/whatsapp` — sem número conectado, vê o estado vazio e o botão "Conectar número" ativo
2. Admin clica em "Conectar número"
3. O popup do Meta Embedded Signup abre no navegador
4. Admin loga na conta Meta/Facebook e autoriza o app
5. Admin seleciona o número de WhatsApp desejado no fluxo Meta
6. Meta retorna `code`, `phone_number_id` e `waba_id` para o callback do SDK
7. Frontend chama a Server Action `completarConexaoWhatsApp` com esses dados
8. Server Action troca o `code` pelo access token via `GET https://graph.facebook.com/v21.0/oauth/access_token`
9. Server Action busca detalhes do número via `GET https://graph.facebook.com/v21.0/{phone_number_id}`
10. Server Action insere registro na tabela `whatsapp_connections` e revalida a página
11. Página exibe o número, nome de exibição e badge "Conectado"
12. Botão "Conectar número" fica desabilitado

### Edge Cases
- Workspace já tem uma conexão: botão "Conectar número" fica desabilitado; servidor rejeita nova inserção com erro "Já existe um número conectado"
- Usuário fecha o popup Meta sem completar: nada acontece (SDK retorna `status: 'not_authorized'` ou `'unknown'`)

### Cenário de Erro
- Troca de código falha (expirado ou inválido): Server Action retorna `{ erro: "Não foi possível conectar o número. Tente novamente." }`; frontend exibe toast de erro
- Busca de detalhes do número falha: mesmo comportamento — erro genérico exibido
- Erro de banco: mesmo comportamento — erro genérico exibido

---

## Banco de Dados

- Tabela: `whatsapp_connections`
  - `id` (uuid) — PK gerada automaticamente
  - `workspace_id` (uuid, FK → workspaces.id, NOT NULL) — isolamento multi-tenant
  - `phone_number` (text, NOT NULL) — número formatado retornado pela API Meta (ex: "+5511999999999")
  - `display_name` (text, NOT NULL) — nome de exibição retornado pela API Meta
  - `status` (text, NOT NULL, default 'connected') — 'connected' ou 'disconnected'
  - `waba_id` (text, NOT NULL) — ID da WhatsApp Business Account no Meta
  - `phone_number_id` (text, NOT NULL) — ID do número no Meta
  - `access_token` (text, NOT NULL) — token de acesso de longa duração
  - `created_at` (timestamptz, NOT NULL, default now())

**RLS:**
- SELECT: qualquer membro do workspace pode ler (`workspace_id = (select workspace_id from profiles where id = auth.uid())`)
- INSERT/UPDATE/DELETE: somente admin do workspace

---

## Arquivos

- **Criar:** `supabase/migrations/20260426000002_create_whatsapp_connections.sql` — cria a tabela e RLS
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — server actions `listarConexaoWhatsApp` e `completarConexaoWhatsApp`
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/conectar-whatsapp-button.tsx` — client component que carrega o Facebook JS SDK e executa o Embedded Signup
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — converter de mock data para dados reais via `listarConexaoWhatsApp` e usar `ConectarWhatsAppButton`

---

## Dependências Externas

- Meta Graph API v21.0 — troca de código OAuth e busca de detalhes do número de telefone
- Facebook JS SDK (`https://connect.facebook.net/pt_BR/sdk.js`) — carregado dinamicamente no client component para o fluxo Embedded Signup

**Variáveis de ambiente necessárias:**
- `NEXT_PUBLIC_META_APP_ID` — ID do app no Meta (usado pelo SDK no frontend)
- `META_APP_SECRET` — secret do app Meta (usado apenas no backend para trocar o código)

---

## Checklist

- [x] Criar migration `whatsapp_connections` com RLS
- [x] Criar `actions.ts` com `listarConexaoWhatsApp` e `completarConexaoWhatsApp`
- [x] Criar `conectar-whatsapp-button.tsx` com Facebook SDK Embedded Signup
- [x] Converter `page.tsx` para usar dados reais e o novo client component
- [x] Garantir que o botão "Conectar número" fica desabilitado quando já há conexão
