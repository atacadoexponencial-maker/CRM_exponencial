# B19-02: Perfil só deixa o usuário editar o próprio nome

**Tipo:** Implementação
**Página:** Perfil (`/perfil`) e Gestão de usuários (`/configuracoes/usuarios`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulos 2 e 3

## Descrição

Fechar a falha que deixa qualquer usuário logado mudar o próprio papel, a própria
situação e a própria empresa direto pelo navegador. O banco passa a aceitar do próprio
usuário apenas a troca do nome; papel, situação e empresa só mudam pelas telas de
Admin, que precisam continuar funcionando.

## Pronto quando

Editar o próprio nome em `/perfil` funciona igual a hoje; o Admin continua mudando
papel, desativando, reativando e adicionando usuários; e testes automatizados provam
que um usuário logado não consegue mudar o próprio papel, a própria empresa, a própria
situação, nem nada no perfil de outra pessoa. A mudança está aplicada no Supabase de
produção.

## Cenários

### Happy Path
1. Usuário logado em `/perfil` troca o nome e salva. `editarNomePerfil` (já existe,
   `src/app/(auth)/perfil/actions.ts`) faz `update({ name })` com o client do usuário —
   continua permitido, porque `name` é a única coluna que o usuário pode atualizar.
2. Admin muda papel, desativa, reativa e adiciona usuário em `/configuracoes/usuarios`.
   Todas essas actions já usam a chave de serviço (conferido: `usuarios/actions.ts`
   linhas 81-90, 141, 172-180, 206-214), que não depende de grant nem de RLS — nada muda nelas.

### Edge Cases
- Usuário tenta `update({ role: 'admin' })` no próprio perfil pelo navegador → o banco
  recusa por falta de permissão na coluna; o papel não muda.
- Usuário tenta `update({ workspace_id: <outra> })` → recusado; continua na mesma empresa.
- Usuário desativado tenta `update({ status: 'active' })` → recusado.
- Usuário tenta `update({ name })` no perfil de outra pessoa → a policy (`id = auth.uid()`)
  não deixa a linha ser alcançada; nada muda.
- `update({ name, role })` junto → o pedido inteiro é recusado (nem o nome muda).

### Cenário de Erro
- Se a tela de perfil mandar alguma coluna além de `name` no futuro, o banco recusa e
  `editarNomePerfil` já devolve "Não foi possível salvar. Tente novamente." — sem mudança de código.

## Banco de Dados

- Tabela `profiles` — sem colunas novas. Muda a permissão:
  - `revoke update on public.profiles from anon, authenticated;`
  - `grant update (name) on public.profiles to authenticated;`
  - policy "Usuários atualizam próprio perfil" recriada com `using (id = auth.uid()) with check (id = auth.uid())`
- Estado atual conferido no remoto (06/10): `authenticated` tem UPDATE em `id, workspace_id,
  name, role, status, created_at`. INSERT e DELETE não têm policy, então já são recusados pelo RLS — não mudam.
- **Aplicar com `npx supabase db push --linked`** e conferir `has_column_privilege` no remoto.

## Arquivos

- **Criar:** `supabase/migrations/20261006000003_profiles_usuario_so_edita_nome.sql` — revoke/grant e policy com `with check`.
- **Criar:** `src/test/perfil-seguranca.integration.test.ts` — ataques contra o Supabase real (papel, empresa, situação, perfil alheio) e o caminho legítimo (trocar o próprio nome).

> `editarNomePerfil` e as actions de usuários não mudam.

## Dependências Externas

- Nenhuma.

## Checklist

- [x] Migration com `revoke update`, `grant update (name)` e policy com `with check`
- [x] `npx supabase db push --linked` aplicado; `has_column_privilege('authenticated','profiles','role','UPDATE')` = false e `name` = true no remoto
- [x] Testes de ataque e do caminho legítimo passando
- [x] Testes existentes de perfil e usuários (`perfil.integration.test.ts`, `usuarios.integration.test.ts`) passando
