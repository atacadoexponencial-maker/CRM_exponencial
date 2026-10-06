# B19-04: Tempo real do chat em canal fechado

**Tipo:** Implementação
**Página:** Chat (`/chat`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 5

## Descrição

Fechar a falha que transmite o aviso de mensagem nova, com o texto, num canal que
qualquer pessoa pode ouvir sabendo o código da empresa. O canal passa a ser fechado:
só entra quem está logado e pertence àquela empresa, tanto para ouvir quanto para
mandar avisos.

## Pronto quando

Com o chat aberto, mensagem recebida aparece na hora sem recarregar; contato excluído
some da caixa ao vivo; o chat aberto por muito tempo (sessão renovada) continua
recebendo; e testes automatizados provam que alguém sem login não entra no canal da
empresa, um usuário de outra empresa também não, e ninguém de fora consegue injetar
aviso falso. Conferido com mensagem real chegando no CRM publicado.

## Cenários

### Happy Path
1. O servidor transmite `nova_mensagem`, `contato_excluido` e `contato_restaurado` no
   tópico `workspace:<id>` com `private: true` (`src/lib/whatsapp/realtime.ts`, corpo da
   API REST de broadcast — formato conferido em `@supabase/realtime-js`, `httpSend`).
2. O chat assina o mesmo tópico com `config: { private: true }` (`chat-layout.tsx`). Já
   chama `supabase.realtime.setAuth(token)` antes do `subscribe` (B10/408b6ef) — exigido
   para canal privado; renovação do token é feita pelo próprio cliente.
3. O Realtime só deixa entrar no canal privado quem passa na policy de SELECT em
   `realtime.messages`: tópico igual a `workspace:` + empresa do usuário logado
   (`public.get_auth_user_workspace_id()`, já existe).
4. Os `postgres_changes` do mesmo canal (conversas e mensagens) seguem iguais — passam pela RLS das tabelas.

### Edge Cases
- Anônimo assinando `workspace:<id>` como canal **público**: canal público e privado
  com o mesmo nome são separados (doc do Supabase: "a public broadcast only reaches
  public channels and a private broadcast only reaches private channels") — não recebe nada.
- Anônimo ou usuário de outra empresa tentando entrar no canal **privado**: a policy recusa a entrada.
- Injetar aviso falso: não há policy de INSERT em `realtime.messages`, então nenhum
  cliente transmite no canal privado; transmissão no canal público não chega a quem ouve o privado.
- Chat aberto antes do deploy (canal público): para de receber até recarregar a página — aceitável, uma vez.

### Cenário de Erro
- Se a policy não estiver aplicada quando o código novo entrar no ar, o chat não entra
  no canal e para de atualizar ao vivo. **Ordem:** aplicar a migration (só acrescenta
  policy, não quebra nada) **antes** de publicar o código.

## Banco de Dados

- Tabela `realtime.messages` (do Supabase) — policy nova de SELECT para `authenticated`:
  `extension = 'broadcast' and realtime.topic() = 'workspace:' || public.get_auth_user_workspace_id()::text`.
- Nenhuma policy de INSERT (clientes não transmitem).

## Arquivos

- **Criar:** `supabase/migrations/20261006000005_realtime_canal_da_empresa.sql` — policy em `realtime.messages`.
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `private: true` em cada mensagem transmitida.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — `.channel(\`workspace:${workspaceId}\`, { config: { private: true } })`; atualizar o comentário que diz que o broadcast não passa por RLS.
- **Criar:** `src/test/tempo-real-seguranca.integration.test.ts` — contra o Realtime real: membro da empresa recebe a transmissão privada; anônimo (canal público com o mesmo nome) não recebe; usuário de outra empresa não entra no canal privado; cliente não consegue transmitir no canal privado.

## Dependências Externas

- Supabase Realtime Authorization — https://supabase.com/docs/guides/realtime/authorization

## Checklist

- [x] Migration com a policy aplicada no remoto (`db push`) **antes** do código
- [x] `realtime.ts` transmite com `private: true`
- [x] `chat-layout.tsx` assina com `private: true`
- [x] Testes de ataque e de recebimento passando; testes existentes do chat (`chat-tempo-real-credencial`) passando; build e lint ok
- [ ] Conferido no CRM publicado: mensagem real chega ao vivo (teste manual da Marcelle)
