# B46-05: Troca do `.env.local`, migration da B45 e documentação

**Tipo:** Implementação
**Página:** Troca do `.env.local` e documentação / Migration nova testada antes da produção
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Depois que a B45 for commitada no `master`, apontar o `.env.local` para o banco
de teste, testar a migration da B45 nele antes da produção e atualizar o
`CLAUDE.md` e o `e2e/preview/README.md`.

## Pronto quando

Os testes locais de todo mundo vão para o banco de teste, a migration da B45
passou por ele antes da produção, e a documentação diz qual banco é qual.

**Só começa depois do commit da B45 no `master`.**

## Critérios de aceite

- **CA-B46-15** (manual) — a próxima migration nova é testada no banco de teste antes da produção. Dado a primeira migration nova commitada depois da B46, ainda não aplicada na produção, quando ela é aplicada no banco de teste e os testes da série dela rodam lá, então a Marcelle confere que os testes passaram no banco de teste e que a produção só recebeu a migration depois disso.
- **CA-B46-16** (manual) — a troca só acontece depois do commit da B45. Dado o banco de teste pronto e a B45 ainda sem commit no `master`, quando o commit da B45 aparece no `master`, então o `.env.local` passa a apontar os testes para o banco de teste, e antes desse commit ele não muda.
- **CA-B46-17** (manual) — a documentação diz qual banco é qual. Dado a mudança no ar, quando alguém lê o `CLAUDE.md` e o `e2e/preview/README.md`, então os dois dizem que a produção e o banco de teste são separados, que o preview e os testes usam o de teste, que os testes com chip e os roteiros de envio usam a produção, e como aplicar migration no banco de teste. O aviso "o Supabase é um só" sai dos dois.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-06 | Quando trocar o `.env.local` para o banco de teste? | respondida | Logo depois que a B45 for commitada no `master`, sem perguntar (Marcelle, 27/10/2026) |

## Cenários

### Happy Path
1. O branch recebe o `master` (B45 e o fechamento da B44).
2. `npm run db:teste:push` aplica no banco de teste as migrations da B45, que já estavam na produção; os testes da B46 e os da B45 rodam no banco de teste.
3. A "troca do `.env.local`" é, na prática, o `.env.teste.local` copiado para a pasta principal: desde a B46-02, o Vitest põe o Supabase dele por cima do `.env.local`. O `.env.local` continua apontando para a produção, porque o `npm run dev` local não muda.
4. O `CLAUDE.md` ganha a seção "Bancos de dados": produção e banco de teste separados, quem usa cada um e como aplicar migration no banco de teste. O aviso "o Supabase é um só" sai.
5. A série entra no `master` e vai para o GitHub (a produção é publicada de novo, sem mudança no app).

### Edge Cases
- **Pasta principal com trabalho de outra sessão:** antes do merge, confere `git status`; com arquivo mexido de outra sessão, para e pergunta.
- **Quem clona o projeto sem o `.env.teste.local`:** o Vitest se recusa a rodar (trava da B46-02). O `CLAUDE.md` diz como pedir o arquivo.

### Cenário de Erro
- **Migration da B45 falha no banco de teste:** para antes do merge e avisa.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-15 | manual | roteiro abaixo | a próxima migration nova passa pelo banco de teste antes da produção |
| CA-B46-16 | manual | roteiro abaixo | o banco de teste só passou a valer na pasta principal depois do commit da B45 |
| CA-B46-17 | manual | roteiro abaixo | o `CLAUDE.md` e o README dizem qual banco é qual |

### Roteiro manual — CA-B46-15
1. Na próxima série que tiver migration, confira na issue que `npm run db:teste:push` rodou e que os testes da série passaram antes do `npx supabase db push --linked`.
2. Confira que a migration apareceu na produção só depois disso.

### Roteiro manual — CA-B46-16
1. No `git log` do `master`, a B45 (`fc11647`, 28/10/2026) é anterior ao merge da B46.
2. Na pasta principal, o `.env.teste.local` existe e o `npx vitest run src/test/banco-de-teste-vitest.integration.test.ts` passa.

### Roteiro manual — CA-B46-17
1. Leia a seção "Bancos de dados" do `CLAUDE.md` e o começo do `e2e/preview/README.md`.
2. Os dois dizem que produção e teste são separados, que preview e testes usam o de teste, que chip e roteiros de envio usam a produção, e como aplicar migration no banco de teste. Nenhum diz que "o Supabase é um só".

## Banco de Dados

No banco de teste, as migrations da B45 (`20261027000010` a `20261027000013`). Nenhuma migration nova.

## Arquivos

- **Modificar:** `CLAUDE.md` — seção "Bancos de dados" e a empresa de teste nos dois bancos
- **Modificar:** `e2e/preview/README.md` — chip e roteiros de envio na produção, e migration do branch no banco de teste

Fora do git: o `.env.teste.local` copiado para a pasta principal.

## Checklist

- [x] Trazer o `master` para o branch
- [x] Aplicar as migrations da B45 no banco de teste e rodar os testes da B46 e da B45 nele
- [x] Atualizar o `CLAUDE.md`
- [x] Copiar o `.env.teste.local` para a pasta principal
- [x] Rodar o `tsc` no projeto inteiro
