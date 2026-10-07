# B20-02: Usuário desativado perde o acesso de verdade

**Tipo:** Implementação
**Página:** Gestão de usuários, Login e todo o CRM
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 1

## Descrição

Desativar passa a cortar o acesso em todas as portas: o login recusa com aviso, a sessão
aberta para de valer na próxima página ou ação, e o banco deixa de entregar dados para a
sessão antiga. Reativar devolve tudo como era.

## Pronto quando

Com um usuário de teste: desativado, ele não entra (vê "Esta conta foi desativada. Fale
com o administrador da sua empresa."), a sessão que já estava aberta cai no login na
próxima ação, e testes automatizados provam que a sessão antiga não lê conversas,
contatos nem mensagens pelo banco nem usa ações do CRM; reativado, entra com a mesma
senha, papel e times.

## Cenários

> Experimento de 06/10 (script descartável, usuário de teste): banir no Supabase Auth
> derruba `getUser`, refresh e login (`user_banned`, 403), **mas o token já emitido
> continua aceito pelo banco (PostgREST) até expirar (~1h)**. Por isso são duas camadas.

### Happy Path
1. **Admin desativa:** `desativarUsuario` grava `status = 'inactive'` (como hoje) e bane o
   usuário no Auth (`auth.admin.updateUserById(id, { ban_duration: "876000h" })`).
2. **Camada do banco:** `get_auth_user_workspace_id()` só devolve a empresa de perfil
   `active`, e a policy "Usuários leem o próprio perfil" passa a exigir `status = 'active'`.
   Conferido no remoto: das 73 policies de `public`, 24 usam a função e 54 leem o próprio
   perfil por subconsulta (a RLS de `profiles` vale dentro dela); a única outra
   (`pipeline_card_labels`) depende de `pipeline_cards`. Logo, para um inativo, toda
   policy fecha — inclusive com o token antigo.
3. **Desativado tenta entrar:** `realizarLogin` recebe `user_banned` e devolve "Esta conta
   foi desativada. Fale com o administrador da sua empresa."
4. **Desativado com o CRM aberto:** na próxima página, o middleware recebe `user_banned`
   no `getUser` e manda para `/login?motivo=desativada`; a tela de login mostra o aviso.
   Na próxima ação, o `getUser` da action falha e ela devolve "Não autorizado".
5. **Admin reativa:** `reativarUsuario` grava `status = 'active'` e tira o ban
   (`ban_duration: "none"`). Mesma senha, papel e times — nada disso foi apagado.

### Edge Cases
- Perfil inativo que não está banido (desativado antes desta issue — hoje não há nenhum
  no remoto, conferido em 06/10): o login passa no Auth mas o perfil não aparece (RLS);
  `realizarLogin` encerra a sessão e devolve o mesmo aviso de conta desativada.
- Ban falha depois do status gravado: a action devolve erro "Não foi possível desativar…"
  e a camada do banco já bloqueia os dados; Admin pode tentar de novo.
- Admin não pode desativar a si mesmo (já existe).

### Cenário de Erro
- Falha ao tirar o ban na reativação: devolve "Não foi possível reativar…"; o status
  volta a `inactive` para não ficar meio-reativado.

## Banco de Dados

- `public.get_auth_user_workspace_id()` — passa a filtrar `status = 'active'`.
- `profiles` — policy "Usuários leem o próprio perfil" recriada com `id = auth.uid() and status = 'active'`.
- Ordem: o banco pode ir antes do código (só fecha acesso de inativos; hoje não há nenhum).

## Arquivos

- **Criar:** `supabase/migrations/20261006000007_inativo_sem_acesso.sql` — função e policy.
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — `desativarUsuario` bane; `reativarUsuario` tira o ban (e desfaz o status se falhar).
- **Modificar:** `src/app/login/actions.ts` — `user_banned` ou perfil ausente → aviso de conta desativada (encerrando a sessão).
- **Modificar:** `src/middleware.ts` — `user_banned` no `getUser` → `/login?motivo=desativada`.
- **Criar:** `src/app/login/avisos.ts` — texto do aviso de conta desativada, usado pela action e pela tela (um `"use server"` só exporta funções).
- **Modificar:** `src/app/login/page.tsx` — lê `searchParams` e mostra o aviso quando `motivo=desativada`.
- **Criar:** `src/test/usuario-desativado-seguranca.integration.test.ts` — contra o Supabase real.

## Dependências Externas

- Supabase Auth Admin `updateUserById` com `ban_duration` (`"none"` para tirar o ban).

## Checklist

- [x] Migration aplicada e conferida no remoto
- [x] Desativar bane; reativar tira o ban e desfaz status se falhar
- [x] Login com aviso de conta desativada (banido e inativo sem ban)
- [x] Middleware leva o banido para `/login?motivo=desativada`; tela mostra o aviso
- [x] Testes: desativado não entra; token antigo não lê conversas, contatos, mensagens nem perfis pelo banco; reativado entra e vê os dados
- [x] Testes existentes de usuários passando; build e lint ok
