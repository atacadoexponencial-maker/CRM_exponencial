# B46-01: Banco de teste no ar, igual à produção

**Tipo:** Implementação
**Página:** O banco de teste / Migration nova testada antes da produção
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Criar o projeto Supabase de teste na organização própria e gratuita "crm-exponencial-teste", aplicar
nele todas as migrations do `master`, igualar as pastas de arquivos e o login à
produção, e deixar um comando que aplica migration só nele.

## Pronto quando

O banco de teste existe, tem a mesma estrutura da produção, aceita login, não
tem empresa de cliente, e uma migration nova pode ser aplicada nele sem tocar a
produção.

## Critérios de aceite

- **CA-B46-01** (automática) — o banco de teste tem todas as migrations do master. Dado o banco de teste criado, quando se compara a lista de migrations aplicadas nele com a pasta de migrations do `master`, então as duas listas são iguais, sem nenhuma faltando.
- **CA-B46-02** (automática) — as pastas de arquivos são as mesmas da produção. Dado o banco de teste criado, quando se compara a lista de pastas de arquivos dele com a da produção, então as pastas são as mesmas, com os mesmos limites de tamanho e de tipo de arquivo e a mesma regra de pública ou privada.
- **CA-B46-03** (automática) — dá para criar usuário e entrar no banco de teste. Dado o banco de teste criado, quando um teste cria um usuário com e-mail e senha e entra com ele, então o login funciona, sem pedir confirmação de e-mail, igual à produção.
- **CA-B46-04** (automática) — o banco de teste não tem empresa de cliente. Dado o banco de teste em uso, quando se lista as empresas dele, então todas têm o nome começando com "[TESTE]".
- **CA-B46-14** (automática) — dá para aplicar migration só no banco de teste. Dado uma migration nova que ainda não está em nenhum dos dois bancos, quando alguém usa o comando de aplicar migration no banco de teste, então ela aparece aplicada no banco de teste e continua faltando na produção.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-01 | O banco de teste fica na mesma região da produção (us-west-2), perto das funções da Vercel, para os testes de tempo de resposta (como o do webhook na B11-09) valerem igual | invalidada | O banco de teste fica em us-east-1 (Virgínia); a Marcelle preferiu não refazer o projeto. Teste de tempo de resposta que falhar só por distância não é defeito do código (Marcelle, 27/10/2026) |
| SUP-B46-02 | O Claude cria o projeto pela CLI do Supabase, que já está logada na conta da organização, e grava a senha do banco só no arquivo de ambiente local | invalidada | A Marcelle cria o projeto pelo painel, para ver o custo antes; o Claude faz o resto (Marcelle, 27/10/2026) |
| SUP-B46-03 | O Luan já tem acesso ao banco de teste por ser membro da organização "Atacado Exponencial"; as chaves chegam a ele do mesmo jeito que as da produção | invalidada | O banco de teste fica na organização própria "crm-exponencial-teste", no plano grátis; o Luan precisa ser convidado para ela (Marcelle, 27/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-01 | Projeto novo ou Supabase Branching? | respondida | Projeto novo, numa organização própria e gratuita ("crm-exponencial-teste"), criada pela Marcelle para não pagar (Marcelle, 27/10/2026) |

## Cenários

### Happy Path
1. O projeto de teste (`cxqdiqhcvdecujlxthmd`, organização "crm-exponencial-teste", us-east-1) já existe, criado pela Marcelle no painel.
2. O arquivo `.env.teste.local` (fora do git, regra `.env.*.local` do `.gitignore`) guarda o endereço, a chave anon e a service_role do projeto de teste (chaves legacy, pegas com `supabase projects api-keys`), o ref do projeto e a senha do banco (`SUPABASE_TESTE_DB_PASSWORD`, movida do `.env.local`).
3. `npm run db:teste:push` lê o `.env.teste.local`, monta o endereço de conexão do banco de teste e roda `supabase db push --db-url ... --yes`. As 137 migrations do `master` são aplicadas.
4. As 3 pastas de arquivos (`chat-attachments`, `contact-photos`, `catalog-images`) nascem das próprias migrations, com os mesmos limites da produção (conferido em 27/10: as três da produção vêm de migrations).
5. O login funciona como na produção: o app cria usuário com `auth.admin.createUser({ email_confirm: true })` e entra com `signInWithPassword`.

### Edge Cases
- **Ref de produção no `.env.teste.local`:** o comando recusa e para, antes de conectar ("o ref é o da produção: este comando só aplica no banco de teste").
- **Migration que dependia de algo criado à mão na produção:** o push para na migration que falhar. Ela é corrigida para funcionar num banco do zero sem mudar o efeito na produção (ex.: `if not exists`), e o caso é contado à Marcelle antes de seguir.
- **Conexão direta só por IPv6:** o banco grátis não tem IPv4 na conexão direta. O comando usa o pooler (modo sessão, porta 5432) da região do projeto.
- **Comando rodado duas vezes:** o `db push` só aplica as que faltam; sem nada novo, termina sem erro.

### Cenário de Erro
- **Senha ou ref faltando no `.env.teste.local`:** o comando para e diz qual variável falta, sem mostrar valor nenhum.
- **Senha errada ou banco pausado:** a mensagem do CLI aparece como está, e o comando termina com código de erro.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-01 | automática | `src/test/banco-de-teste.integration.test.ts` | a lista de versões em `supabase_migrations.schema_migrations` do banco de teste é igual à lista de arquivos de `supabase/migrations/` |
| CA-B46-02 | automática | `src/test/banco-de-teste.integration.test.ts` | `storage.listBuckets()` do banco de teste e da produção devolvem as mesmas pastas, com o mesmo `public`, `file_size_limit` e `allowed_mime_types` |
| CA-B46-03 | automática | `src/test/banco-de-teste.integration.test.ts` | no banco de teste, um usuário criado com `email_confirm: true` entra com `signInWithPassword` e recebe sessão; o usuário é apagado no fim |
| CA-B46-04 | automática | `src/test/banco-de-teste.integration.test.ts` | toda linha de `workspaces` do banco de teste tem `name` começando com "[TESTE]" |
| CA-B46-14 | automática | `src/test/banco-de-teste.integration.test.ts` | com uma pasta temporária contendo as migrations + uma migration de prova (cria `public._b46_prova`), `aplicar-migrations.mjs --workdir` aplica a de prova só no teste: a versão aparece em `schema_migrations` do teste e não na da produção, e a tabela existe só no teste. No fim, a tabela é apagada e a versão desfeita (`migration repair --status reverted`) |

## Banco de Dados

Nenhuma tabela nova. O banco de teste recebe as migrations que já existem.

## Arquivos

- **Criar:** `supabase/banco-de-teste/comum.mjs` — lê o `.env.teste.local`, recusa o ref da produção, monta o endereço do pooler com a senha codificada
- **Criar:** `supabase/banco-de-teste/aplicar-migrations.mjs` — roda `supabase db push --db-url` no banco de teste; aceita `--workdir <pasta>`
- **Modificar:** `package.json` — script `db:teste:push`
- **Criar:** `src/test/banco-de-teste.integration.test.ts` — testes dos critérios desta issue

Fora do git: `.env.teste.local` (criado na pasta do worktree e, na B46-05, na pasta principal) e uma cópia do `.env.local` no worktree, para os testes acharem a produção. As consultas à produção nos testes usam só `supabase db query --project-ref` (leitura, pela conta do CLI) e a chave de serviço que o `.env.local` já tem.

## Dependências Externas

- Supabase CLI (`npx supabase`, 2.122.0, já usado no projeto): `db push --db-url`, `db query --project-ref`, `migration repair --db-url`, `projects api-keys`.

## Checklist

- [x] Criar o `.env.teste.local` com as chaves do projeto de teste e a senha do banco
- [x] Criar `supabase/banco-de-teste/comum.mjs`
- [x] Criar `supabase/banco-de-teste/aplicar-migrations.mjs`
- [x] Acrescentar `db:teste:push` no `package.json`
- [x] Aplicar as migrations no banco de teste com `npm run db:teste:push`
- [x] Rodar o `tsc` no projeto inteiro
