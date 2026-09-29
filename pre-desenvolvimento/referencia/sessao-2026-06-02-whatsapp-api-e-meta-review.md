# Sessão 2026-06-02/03 — WhatsApp API, Realtime e Meta App Review

## O que foi resolvido

### 1. Mensagens recebidas não apareciam em tempo real
**Causa:** O `postgres_changes` INSERT na tabela `messages` não entregava eventos porque o filtro server-side `workspace_id` era descartado silenciosamente (REPLICA IDENTITY não configurada).

**Solução:** Substituído por **Supabase Broadcast** — o webhook, após inserir a mensagem no banco, envia um broadcast via `POST /realtime/v1/api/broadcast` com o service role key. O browser escuta o canal `workspace:{workspaceId}` e recebe o evento `nova_mensagem` instantaneamente.

Arquivos alterados:
- `src/app/api/webhooks/whatsapp/route.ts` — envia broadcast após inserir mensagem recebida
- `src/app/(auth)/chat/components/chat-layout.tsx` — escuta broadcast em vez de postgres_changes INSERT

---

### 2. Erro 403 ao enviar mensagens (Meta API)
**Causa:** A função `enviarMensagem` em `actions.ts` não capturava o corpo do erro, dificultando diagnóstico.

**Correção aplicada:** Adicionado `await metaRes.text()` no catch para logar o erro completo.

> **Status:** O 403 ainda não foi resolvido. Precisa investigar com o novo log.

---

### 3. Embedded Signup — config errada
**Causa raiz:** A configuração `NEXT_PUBLIC_META_CONFIG_ID` apontava para `979095131795875` (variação "General"), que **não gera o evento `WA_EMBEDDED_SIGNUP FINISH`** com `phone_number_id` e `waba_id`. Por isso o Embedded Signup nunca completava.

**Solução:**
1. Criada nova configuração no Meta chamada "CRM Exponencial WhatsApp" com:
   - Variação: **Cadastro incorporado do WhatsApp**
   - Produto: **WhatsApp Cloud API**
   - Token: **Token de acesso do usuário do sistema** / **Nunca expira**
   - Ativo: **Contas do WhatsApp** (automático)
2. Novo config ID: **`4323624887902256`**
3. Valor hardcoded temporariamente no código em `wizard-conexao.tsx` (linha `config_id: "4323624887902256"`)

> **Pendente:** Substituir o valor hardcoded pelo env var `process.env.NEXT_PUBLIC_META_CONFIG_ID` depois de confirmar que o Vercel lê corretamente. Atualizar `NEXT_PUBLIC_META_CONFIG_ID=4323624887902256` no Vercel.

---

### 4. SDK do JavaScript ativado
No painel Meta → Login do Facebook para Empresas → Configurações:
- "Entrar com o SDK do JavaScript" → **Sim**
- Domínio adicionado: `crm-exponencial.vercel.app`

---

### 5. Mensagens do banco de teste limpas
Deletadas as 16 mensagens da conversa do número de teste (`5521970692725`) via script Node com service role.

---

### 6. Fix de criação de templates
**Causa:** `criarTemplate` em `actions.ts` não enviava o `access_token` no POST para a API da Meta.
**Correção:** Adicionado `?access_token=${conexao.access_token}` na URL do POST.

---

## Pendências para próxima sessão

1. **Resolver erro 403 no envio de mensagens** — rodar o novo deploy e verificar o log completo do erro
2. **Verificar se templates funcionam** — o fix foi deployado, precisa testar
3. **Testar Embedded Signup com número real** — precisa de um número WhatsApp Business disponível (chip novo ou número não cadastrado no WhatsApp)
4. **Substituir config_id hardcoded pelo env var** — após confirmar que o Embedded Signup funciona
5. **Gravar vídeos para o App Review da Meta:**
   - Vídeo 1 (`whatsapp_business_messaging`): enviar/receber mensagem
   - Vídeo 2 (`whatsapp_business_management`): criar template
   - Vídeo 3 (`whatsapp_business_manage_events`): status de entrega/leitura
   - Vídeo 4 (`business_management`): fluxo Embedded Signup completo
6. **Verificação de negócio no Meta Business Manager** — necessária para Advanced Access
7. **Completar formulário do App Review** — faltam os vídeos em todas as permissões

## Configurações Meta — Estado atual

| Item | Valor |
|------|-------|
| App ID | `1674785157105627` |
| Config ID (Embedded Signup) | `4323624887902256` (novo, correto) |
| WABA ID | `2619063891880183` |
| Phone Number ID (teste) | `1143474938847402` |
| Número de teste | `+55 21 97069 2725` |
| Webhook URL | `https://crm-exponencial.vercel.app/api/webhooks/whatsapp` |
