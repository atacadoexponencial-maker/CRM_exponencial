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

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-06 | Quando trocar o `.env.local` para o banco de teste? | respondida | Logo depois que a B45 for commitada no `master`, sem perguntar (Marcelle, 27/10/2026) |
