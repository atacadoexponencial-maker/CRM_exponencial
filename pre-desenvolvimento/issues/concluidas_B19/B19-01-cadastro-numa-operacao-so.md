# B19-01: Cadastro de empresa numa operação só

**Tipo:** Implementação
**Página:** Cadastro (`/cadastro`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 1

## Descrição

Fechar a falha que deixa qualquer pessoa, sem login, virar Admin de uma empresa que já
existe. O cadastro passa a ser uma operação única no servidor — empresa, Admin, times
padrão e sequências do método nascem juntos ou nada nasce — que valida os dados no
servidor e nunca aceita código de empresa vindo de fora. Some a criação avulsa de
empresa e a consulta avulsa "este e-mail existe?"; o "E-mail já está em uso" passa a
ser resposta da própria tentativa de cadastro.

## Pronto quando

Um cadastro novo pela tela funciona igual a hoje (entra logado e cai na conexão do
WhatsApp); e-mail repetido mostra "E-mail já está em uso" sem criar nada; e testes
automatizados provam que (a) tentar criar Admin numa empresa existente é recusado,
(b) não dá para criar empresa solta chamando o servidor direto, (c) dados inválidos
mandados direto ao servidor são recusados, (d) falha no meio não deixa empresa ou
usuário pela metade.

## Cenários

### Happy Path
1. Visitante preenche `/cadastro` e envia. A tela chama **uma** server action,
   `cadastrarEmpresa(dados)`, com os cinco campos do formulário.
2. O servidor valida `dados` com o mesmo `schema` zod da tela (agora em arquivo
   compartilhado). Campos extras (ex.: `workspaceId`) são descartados pelo zod.
3. O servidor cria o usuário no Auth (`auth.admin.createUser`, `email_confirm: true`, como hoje).
4. O servidor chama a função do banco `cadastrar_empresa(p_user_id, p_nome_empresa,
   p_nome_responsavel)`, que numa **única transação** cria a empresa, o perfil `admin`
   do usuário e os times Entrada e Recompra, e devolve o id da empresa. A função só
   pode ser executada pela service role.
5. O servidor chama `garantirSequenciasPredefinidas(workspaceId)` (já existe, falha silenciosa).
6. O servidor faz o login (`signInWithPassword` pelo client SSR, como hoje) e devolve `{ ok: true }`.
7. A tela faz `router.refresh()` e `router.push("/configuracoes/whatsapp")`, como hoje.

### Edge Cases
- **E-mail já cadastrado:** `createUser` devolve erro `email_exists` (status 422). A action
  devolve `{ erro: "email_em_uso" }` sem criar nada; a tela mostra "E-mail já está em uso"
  no campo e-mail. (Some a consulta `listUsers`, que além de oráculo só olhava os 1000
  primeiros usuários.)
- **Dados inválidos mandados direto ao servidor** (pulando a tela): `safeParse` falha → `{ erro: "dados_invalidos" }`, nada criado.
- **Chamada com `workspaceId` de empresa existente:** não há parâmetro para isso; a
  função do banco sempre cria empresa nova. Não existe mais `criarAdminETimesPadrao` nem
  `criarWorkspace` exportadas.
- **Chamada direta à função do banco por anon/authenticated:** recusada (`revoke execute`).
- **Nomes com espaços nas pontas:** o servidor apara (`trim`) antes de gravar.

### Cenário de Erro
- **Falha na função do banco** (qualquer insert): a transação desfaz empresa, perfil e
  times; a action apaga o usuário recém-criado no Auth (`auth.admin.deleteUser`) e devolve
  `{ erro: "falha" }`. A tela mostra "Não foi possível concluir o cadastro. Tente novamente." no campo nome da empresa.
- **Falha ao criar o usuário no Auth** (que não seja e-mail em uso): `{ erro: "falha" }`, nada criado.
- **Falha no login depois de tudo criado:** a empresa e o Admin já existem e estão
  corretos; devolve `{ erro: "falha_login" }` e a tela manda para `/login`, onde a pessoa entra
  com o e-mail e a senha que acabou de criar (não desfaz o cadastro).

## Banco de Dados

- Função nova `public.cadastrar_empresa(p_user_id uuid, p_nome_empresa text, p_nome_responsavel text) returns uuid`
  - `security definer`, `set search_path = public` (padrão de `registrar_pedido_catalogo`)
  - recusa se já existir perfil para `p_user_id`
  - insere em `workspaces (name)`, `profiles (id, workspace_id, name, role='admin')`,
    `teams (workspace_id, name, is_default=true)` × 2 — tudo na mesma transação
  - `revoke execute ... from public, anon, authenticated;` `grant execute ... to service_role;`
- Nenhuma tabela nova nem coluna nova.
- **Aplicar no Supabase de produção** com `npx supabase db push --linked` **antes** de publicar o código (a action nova depende da função).

## Arquivos

- **Criar:** `supabase/migrations/20261006000002_cadastrar_empresa.sql` — função `cadastrar_empresa` e permissões.
- **Criar:** `src/app/cadastro/schema.ts` — o `schema` zod do formulário (sem `"use client"`), usado pela tela e pela action.
- **Modificar:** `src/app/cadastro/actions.ts` — trocar as três actions por uma única `cadastrarEmpresa(dados: unknown)` que devolve `{ ok: true } | { erro: "email_em_uso" | "dados_invalidos" | "falha" | "falha_login" }`. Reusar `createServiceClient` de `@/integrations/supabase/service`, `createClient` de `@/integrations/supabase/server` e `garantirSequenciasPredefinidas` de `@/lib/sequencias`.
- **Modificar:** `src/app/cadastro/page.tsx` — importar `schema` de `./schema` (e reexportar `schema` para não quebrar `src/test/cadastro.test.ts`); `onSubmit` faz uma chamada só e mapeia o resultado para os erros de campo.
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — os testes das três actions antigas viram testes de `cadastrarEmpresa` (etapa de testes).
- **Criar:** `src/test/cadastro-seguranca.integration.test.ts` — testes de ataque contra o Supabase real: anon e authenticated não executam `cadastrar_empresa`; o módulo de actions não exporta mais `criarWorkspace`, `criarAdminETimesPadrao`, `verificarEmailEmUso` (etapa de testes).

## Dependências Externas

- Nenhuma nova. `zod` e `@supabase/supabase-js` já estão no projeto.
  Erro de e-mail repetido no Supabase Auth: `AuthApiError` com `code === "email_exists"` (status 422).

## Checklist

- [x] Migration `20261006000002_cadastrar_empresa.sql` com a função transacional e `revoke`/`grant`
- [x] `npx supabase db push --linked` aplicado e função conferida no remoto (anon não executa)
- [x] `src/app/cadastro/schema.ts` com o schema; `page.tsx` importa e reexporta
- [x] `cadastrarEmpresa` no servidor: `safeParse`, `trim`, `createUser`, RPC, desfaz usuário se a RPC falhar, sequências, login
- [x] Remover `verificarEmailEmUso`, `criarWorkspace` e `criarAdminETimesPadrao` de `actions.ts`
- [x] `page.tsx` com uma chamada só e os quatro desfechos mapeados (e-mail em uso, inválido, falha, falha no login → `/login`)
- [x] Testes: unitários de `cadastrarEmpresa` + testes de ataque contra o banco real
- [x] `npm run build`, `npm run lint` e suíte de testes passando
