# B46-04: Banco de teste sempre acordado

**Tipo:** Implementação
**Página:** Banco de teste sempre acordado
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Criar uma rotina diária que usa o banco de teste, para o plano grátis nunca o
pausar, sem gastar uma das rotinas diárias da Vercel.

## Pronto quando

A rotina roda sozinha todo dia, o banco de teste registra o acesso e, depois de
8 dias sem ninguém testar, ele continua ativo no painel do Supabase.

## Critérios de aceite

- **CA-B46-19** (automática) — a rotina diária usa o banco de teste. Dado a rotina diária ligada, quando ela roda, então o banco de teste registra o acesso do dia, e a produção não recebe nada da rotina.
- **CA-B46-20** (manual) — o banco de teste não pausa. Dado a rotina ligada e 8 dias seguidos sem ninguém rodar teste, quando a Marcelle abre o painel do Supabase, então o projeto do banco de teste aparece ativo, não pausado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-05 | A rotina que mantém o banco acordado não usa nenhuma das rotinas diárias da Vercel, que já estão no limite do plano | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-05 | O que fazer com a pausa de 7 dias do plano grátis? | respondida | Uma rotina diária mantém o banco acordado (Marcelle, 27/10/2026) |

## Cenários

### Happy Path
1. Uma vez, `node supabase/banco-de-teste/manter-acordado.mjs --preparar` cria no banco de teste o usuário da rotina (`rotina-acordado@example.com`, sem empresa) e grava `BANCO_TESTE_ROTINA_EMAIL` e `BANCO_TESTE_ROTINA_SENHA` no `.env.teste.local`.
2. O GitHub Actions (`.github/workflows/banco-de-teste-acordado.yml`) roda todo dia às 09h UTC. Ele recebe o endereço, a chave pública e o login da rotina dos segredos do repositório e roda `node supabase/banco-de-teste/manter-acordado.mjs`, sem instalar nada.
3. O comando entra com o usuário da rotina (o Supabase grava o último login) e lê uma tabela pela API, o que também usa o banco. Imprime "banco de teste acordado".
4. Rodado na máquina, sem as variáveis no ambiente, o comando lê o `.env.teste.local`.

### Edge Cases
- **Endereço da produção** nas variáveis: o comando para com a mensagem da trava, sem acessar nada.
- **O agendamento do GitHub só vale no `master`:** a rotina começa a rodar sozinha depois do merge da série (B46-05). Também dá para disparar à mão pela aba Actions.
- **O usuário da rotina não tem empresa:** a leitura volta vazia pela RLS, e isso basta para o banco registrar o uso.

### Cenário de Erro
- **Login recusado ou banco fora do ar:** o comando termina com erro, e o GitHub marca a execução como falha e avisa por e-mail quem é dono do repositório.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-19 | automática | `src/test/banco-de-teste-acordado.integration.test.ts` | roda o `manter-acordado.mjs` e confere que o último login do usuário da rotina no banco de teste é de agora; na produção, esse usuário não existe; o workflow do GitHub roda o mesmo comando todo dia; e o comando se recusa a rodar com o endereço da produção |
| CA-B46-20 | manual | roteiro abaixo | o banco de teste continua ativo depois de 8 dias sem teste |

### Roteiro manual — CA-B46-20
1. Depois do merge da série no `master`, deixe passar 8 dias sem rodar teste.
2. Abra o painel do Supabase, organização "crm-exponencial-teste", projeto do banco de teste.
3. Ele deve aparecer ativo, não pausado. Na aba Actions do GitHub, "Banco de teste acordado" deve ter uma execução verde por dia.

## Banco de Dados

Nenhuma mudança de schema. No banco de teste, nasce o usuário da rotina.

## Arquivos

- **Criar:** `supabase/banco-de-teste/manter-acordado.mjs` — entra com o usuário da rotina e lê uma tabela; `--preparar` cria o usuário
- **Criar:** `.github/workflows/banco-de-teste-acordado.yml` — roda o comando todo dia
- **Criar:** `src/test/banco-de-teste-acordado.integration.test.ts` — teste do CA-B46-19

Fora do código: os segredos `BANCO_TESTE_URL`, `BANCO_TESTE_ANON_KEY`, `BANCO_TESTE_ROTINA_EMAIL` e `BANCO_TESTE_ROTINA_SENHA` no GitHub.

## Checklist

- [x] Escrever o `manter-acordado.mjs`, com o `--preparar`
- [x] Criar o usuário da rotina no banco de teste
- [x] Escrever o workflow diário
- [x] Gravar os segredos no GitHub
- [x] Rodar o `tsc` no projeto inteiro
