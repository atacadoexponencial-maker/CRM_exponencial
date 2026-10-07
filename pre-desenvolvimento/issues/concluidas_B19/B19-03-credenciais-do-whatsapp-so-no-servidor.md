# B19-03: Credenciais do WhatsApp só no servidor

**Tipo:** Implementação
**Página:** Chat, Templates, Conexão do WhatsApp (e saúde/ritmo), Campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 4

## Descrição

Fechar a falha que deixa qualquer membro da empresa ler pelo navegador as credenciais
dos números (API Oficial e canal direto). O banco deixa de entregar essas colunas a
qualquer usuário, e todo ponto do sistema que hoje as lê com a permissão do usuário
passa a lê-las pelo servidor, só depois de confirmar que o número é da empresa de quem
pediu.

## Pronto quando

Mandar mensagem no chat (texto e mídia, nos dois canais), abrir e criar templates,
reinscrever o webhook, ver saúde e ritmo, conectar/desconectar/reconectar, listar os
números e disparar campanha e sequência continuam funcionando; e testes automatizados
provam que um usuário logado de qualquer papel que peça as colunas de credencial é
recusado pelo banco, e que pedir ação com o número de outra empresa não lê a credencial
dela. A permissão foi conferida no Supabase de produção, não só no arquivo da mudança.

## Cenários

### Happy Path
1. O banco deixa de entregar `access_token` e `instance_token` ao papel `authenticated`
   (e nada da tabela a `anon`). As demais colunas continuam legíveis pela RLS de hoje.
2. Toda leitura de credencial passa a usar a chave de serviço, sempre filtrando pela
   empresa que o servidor tirou da sessão:
   - **Chat** (`enviarMensagem`, mídia, reações, marcar como lida — 6 chamadas em
     `chat/actions.ts`): passam `createServiceClient()` para `resolverProviderDaConversa`.
   - **`resolverProviderDaConversa`** (`src/lib/whatsapp/index.ts`): a busca da conversa
     ganha `.eq("workspace_id", workspaceId)` — com a chave de serviço, a RLS não filtra mais.
   - **Estimativa de ritmo da campanha** (`campanhas/actions.ts:300-306`): lê `instance_token` pela chave de serviço, com o filtro de empresa que já existe.
   - **Templates** (`configuracoes/templates/actions.ts:19-23`): lê `waba_id, access_token` pela chave de serviço, com o filtro de empresa que já existe.
   - **Reinscrever webhook** (`configuracoes/whatsapp/actions.ts:728-732`): idem.
3. Automações, sequências, campanhas (motor), ritmo, saúde, pareamento e webhooks já leem
   pela chave de serviço — não mudam.

### Edge Cases
- `select("*")` em `whatsapp_connections` pelo navegador passa a falhar — conferido: o
  código não faz isso; as listagens pedem colunas sem credencial
  (`listarConexoes`, `listarConexaoWhatsApp`, templates `page.tsx`, conversas com
  `conexao:whatsapp_connections(id, canal, phone_number)`).
- Inserts e updates feitos com o client do usuário (conectar número da Meta, número de
  teste, desconectar/reconectar, remover) continuam: o revoke é só de **leitura**, e as
  colunas usadas no `where` (`id`, `workspace_id`) seguem legíveis.
- Conversa de outra empresa passada ao chat: a busca com `workspace_id` não acha a
  conversa, cai no número da própria empresa — nunca lê a credencial da outra.

### Cenário de Erro
- Se algum ponto não mapeado ainda ler credencial pelo client do usuário, ele recebe
  `permission denied` — os testes existentes do chat, templates e campanhas acusam.

## Banco de Dados

- Tabela `whatsapp_connections` — sem colunas novas. Muda a permissão de leitura:
  - `revoke select on public.whatsapp_connections from anon, authenticated;`
  - `grant select (id, workspace_id, phone_number, display_name, status, waba_id, phone_number_id, created_at, canal, instance_id, state_reason, disconnected_at) on public.whatsapp_connections to authenticated;`
  - (lista conferida no remoto em 06/10; fora: `access_token`, `instance_token`)
- **Ordem de publicação:** primeiro o código (que passa a ler pela chave de serviço)
  entra no ar; **depois** `npx supabase db push --linked`. Aplicar o banco antes quebra o envio do chat em produção.

## Arquivos

- **Criar:** `supabase/migrations/20261006000004_whatsapp_connections_credenciais_de_verdade.sql` — revoke na tabela + grant por coluna.
- **Modificar:** `src/lib/whatsapp/index.ts` — `resolverProviderDaConversa` filtra a conversa por `workspace_id`; comentário do tipo `ClienteSupabase` diz que as funções exigem a chave de serviço.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — as 6 chamadas de `resolverProviderDaConversa` recebem `createServiceClient()` (já importado).
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — leitura de `instance_token` (linha ~301) pela chave de serviço.
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — leitura de `access_token` pela chave de serviço.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — leitura de `access_token` em `reinscreverWebhookWhatsApp` pela chave de serviço.
- **Criar:** `src/test/credenciais-whatsapp-seguranca.integration.test.ts` — usuário logado (admin e atendente) pedindo `access_token`/`instance_token` é recusado; colunas sem credencial continuam legíveis; `resolverProviderDaConversa` com conversa de outra empresa não usa a conexão dela.

## Dependências Externas

- Nenhuma.

## Checklist

- [x] `resolverProviderDaConversa` filtra por `workspace_id`
- [x] Chat, estimativa de campanha, templates e reinscrever webhook leem credencial pela chave de serviço
- [x] Migration com revoke na tabela e grant por coluna
- [x] Testes novos e existentes (`whatsapp-numero-de-origem`, `whatsapp-provider`, chat, templates, campanhas) passando; build e lint ok
- [x] Código publicado **antes** do `db push`; depois do push, `has_column_privilege('authenticated','whatsapp_connections','access_token','SELECT')` = false no remoto
