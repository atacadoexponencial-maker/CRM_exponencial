# B46-02: Testes de integração no banco de teste

**Tipo:** Implementação
**Página:** Testes automáticos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Fazer os testes de integração (Vitest) rodarem no banco de teste, lendo um
arquivo de ambiente próprio, com uma trava que recusa a produção e um aviso
claro quando o banco não responde.

## Pronto quando

A suíte de integração inteira passa no banco de teste, se recusa a rodar contra
a produção e, com o banco pausado, para com uma mensagem só.

## Critérios de aceite

- **CA-B46-05** (automática) — os testes de integração rodam no banco de teste. Dado o ambiente apontando para o banco de teste, quando a suíte de integração roda, então os registros criados pelos testes aparecem no banco de teste e nenhum aparece na produção.
- **CA-B46-06** (automática) — os testes se recusam a rodar contra a produção. Dado o ambiente apontando para o banco de produção, quando alguém roda um teste de integração, então nenhum teste roda e aparece a mensagem "os testes de integração só rodam no banco de teste", sem nenhuma gravação na produção.
- **CA-B46-07** (automática) — a suíte de integração inteira passa no banco de teste. Dado o banco de teste com todas as migrations do `master`, quando a suíte de integração inteira roda nele, então todos os testes passam.
- **CA-B46-08** (automática) — banco fora do ar dá aviso claro. Dado o banco de teste que não responde (pausado ou fora do ar), quando alguém roda um teste de integração, então aparece a mensagem "o banco de teste não respondeu: confira se ele está pausado no painel do Supabase", em vez de dezenas de testes falhando cada um com um erro diferente.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-06 | A trava vale para a execução inteira do Vitest, inclusive os testes de unidade: sem `.env.teste.local`, nenhum teste roda | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-06 | Quando trocar o `.env.local` para o banco de teste? | respondida | Logo depois que a B45 for commitada no `master`, sem perguntar (Marcelle, 27/10/2026) |

## Cenários

### Happy Path
1. Na raiz existe o `.env.teste.local` (criado na B46-01).
2. O `vitest.config.ts` carrega o `.env.local` como hoje e, por cima, as variáveis do Supabase do `.env.teste.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Uma dessas variáveis que já venha do processo (ex.: definida pelo teste que chama o Vitest) vale mais que os arquivos.
3. Antes de rodar qualquer teste, o config confere o banco escolhido: não pode ser a produção e precisa responder.
4. Os testes rodam no banco de teste. Nenhum arquivo de teste muda: todos já leem `process.env`.

### Edge Cases
- **Sem `.env.teste.local`** (pasta que ainda não recebeu o arquivo): o endereço continua sendo o do `.env.local`, que é a produção, então o Vitest inteiro se recusa a rodar com a mensagem da trava. Isso inclui os testes de unidade: a trava vale para a execução toda, não por arquivo. Por isso o merge da série no `master` só acontece na B46-05, junto com o `.env.teste.local` da pasta principal.
- **O `.env.local` continua apontando para a produção.** O `npm run dev` local não muda (fora do escopo).

### Cenário de Erro
- **Endereço da produção:** o Vitest para antes de qualquer teste, com "os testes de integração só rodam no banco de teste", e termina com erro.
- **Banco pausado ou fora do ar:** a conferência (`/auth/v1/health`, com espera máxima de 15 s) falha, e o Vitest para com "o banco de teste não respondeu: confira se ele está pausado no painel do Supabase".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-05 | automática | `src/test/banco-de-teste-vitest.integration.test.ts` | dentro do Vitest, um usuário criado com o cliente montado a partir de `process.env` aparece no banco de teste (pela chave do `.env.teste.local`) e não aparece na produção (pela chave do `.env.local`); o usuário é apagado no fim |
| CA-B46-06 | automática | `src/test/banco-de-teste-vitest.integration.test.ts` | um Vitest filho, com as variáveis do Supabase da produção, termina com erro, mostra "os testes de integração só rodam no banco de teste" e não roda nenhum teste |
| CA-B46-07 | automática | `src/test/banco-de-teste-vitest.integration.test.ts` | um Vitest filho roda todos os arquivos `*.integration.test.*`, um de cada vez (todos juntos estouram o limite de login do Supabase), menos os `banco-de-teste*` (para não chamar a si mesma), no banco de teste, e termina sem nenhum teste falhando |
| CA-B46-08 | automática | `src/test/banco-de-teste-vitest.integration.test.ts` | um Vitest filho, com um endereço de Supabase que não responde, termina com erro, mostra "o banco de teste não respondeu: confira se ele está pausado no painel do Supabase" e não roda nenhum teste |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Modificar:** `vitest.config.ts` — põe por cima as variáveis do Supabase do `.env.teste.local` e chama a trava antes de rodar
- **Modificar:** `supabase/banco-de-teste/comum.mjs` — a trava (`conferirBancoDosTestes`): recusa a produção e confere se o banco responde
- **Criar:** `src/test/banco-de-teste-vitest.integration.test.ts` — testes dos critérios desta issue
- **Modificar:** `src/test/banco-de-teste.integration.test.ts` — os testes da B46-01 passam a ler a produção do `.env.local` (`lerEnvProducao`), porque o `process.env` agora é o banco de teste

## Checklist

- [x] Escrever a trava em `supabase/banco-de-teste/comum.mjs`
- [x] Ligar o `.env.teste.local` e a trava no `vitest.config.ts`
- [x] Rodar a suíte inteira no banco de teste e corrigir o que falhar por diferença de banco
- [x] Rodar o `tsc` no projeto inteiro
