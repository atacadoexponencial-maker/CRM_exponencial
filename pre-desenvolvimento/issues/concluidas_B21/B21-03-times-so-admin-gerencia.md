# B21-03: Só o Admin gerencia times

**Tipo:** Implementação
**Página:** Configurações › Times
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 2

## Descrição

Criar, renomear e apagar times e pôr ou tirar usuários de um time passam a exigir papel
Admin no banco (hoje a regra só olha a empresa). Ler os times continua liberado para todos
da empresa.

## Pronto quando

O Admin gerencia times como hoje; Gerente e Atendente continuam vendo os times onde já
aparecem; e testes automatizados provam que Gerente e Atendente, direto no banco, não
criam, renomeiam nem apagam time e não mexem em quem está em cada time.

## Cenários

> Levantamento de 08/10 (policies lidas do banco): a policy ALL "Admins gerenciam times
> do próprio workspace" só olha a empresa — Gerente e Atendente criam, renomeiam e apagam
> times pelo banco. `user_teams` já exige Admin. As actions de `/configuracoes/times` já
> conferem `role = admin`.

### Happy Path
Admin cria, renomeia, apaga time e define membros, como hoje. Todos da empresa veem os times.

### Edge Cases
- Perfil inativo: sem empresa (`get_auth_user_workspace_id()` nulo), nada passa.

### Cenário de Erro
Gerente/Atendente direto no banco: INSERT recusado; UPDATE/DELETE não afetam nada; pôr-se
num time recusado.

## Banco de Dados

- `teams`: policy ALL "Admins gerenciam times do próprio workspace" → `using`/`with check`
  empresa + `role = 'admin'`.

## Arquivos

- **Criar:** `supabase/migrations/20261008000004_times_so_admin.sql` — policy acima.
- **Criar:** `src/test/times-seguranca.integration.test.ts` — ataques de Gerente/Atendente e fluxo do Admin.

## Checklist

- [x] Migration
- [x] Teste novo passando contra o banco
- [x] `times.integration.test.ts` e `usuarios.integration.test.ts` passando
- [x] Código no ar e migration aplicada
