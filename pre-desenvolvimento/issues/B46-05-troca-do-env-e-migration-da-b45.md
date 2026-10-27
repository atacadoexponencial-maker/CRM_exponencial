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

- **CA-B46-15** (manual) — a migration da B45 é testada no banco de teste antes da produção. Dado a migration da B45 (todo contato nasce com card), commitada e ainda não aplicada na produção, quando ela é aplicada no banco de teste e os testes da B45 rodam lá, então a Marcelle confere que os testes passaram no banco de teste e que a produção só recebeu a migration depois disso.
- **CA-B46-16** (manual) — a troca só acontece depois do commit da B45. Dado o banco de teste pronto e a B45 ainda sem commit no `master`, quando o commit da B45 aparece no `master`, então o `.env.local` passa a apontar os testes para o banco de teste, e antes desse commit ele não muda.
- **CA-B46-17** (manual) — a documentação diz qual banco é qual. Dado a mudança no ar, quando alguém lê o `CLAUDE.md` e o `e2e/preview/README.md`, então os dois dizem que a produção e o banco de teste são separados, que o preview e os testes usam o de teste, que os testes com chip e os roteiros de envio usam a produção, e como aplicar migration no banco de teste. O aviso "o Supabase é um só" sai dos dois.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-06 | Quando trocar o `.env.local` para o banco de teste? | respondida | Logo depois que a B45 for commitada no `master`, sem perguntar (Marcelle, 27/10/2026) |
