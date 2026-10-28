# B46-03: Preview e roteiros no banco de teste

**Tipo:** Implementação
**Página:** Preview da Vercel / Empresa de teste no banco de teste / Roteiros que mandam mensagem de verdade
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Apontar o preview da Vercel para o banco de teste, criar nele a empresa
"[TESTE] Automações B11" com os dados de partida, fazer os roteiros de tela
rodarem contra ele, e mandar os roteiros de envio real para a produção.

## Pronto quando

Um preview novo grava no banco de teste, o roteiro dos menus passa nele com a
empresa de teste de lá, o reset volta essa empresa ao início, os roteiros de
envio se recusam a rodar no preview e a produção continua igual.

## Critérios de aceite

- **CA-B46-09** (automática) — o que se faz no preview grava no banco de teste. Dado um preview publicado depois da mudança, quando um roteiro entra no preview com o admin da empresa de teste e cria uma etiqueta, então a etiqueta aparece no banco de teste e não aparece na produção.
- **CA-B46-10** (manual) — a produção continua no banco de produção. Dado a mudança no ar, quando a Marcelle entra em `crm-exponencial.vercel.app` com o login dela, então ela vê as mesmas empresas, contatos e conversas de antes, e o chat com o número conectado continua recebendo mensagem.
- **CA-B46-11** (automática) — os roteiros de tela rodam no preview com o banco de teste. Dado o preview usando o banco de teste e a empresa de teste criada nele, quando o roteiro dos menus (`roteiro-menus.cjs`) roda contra o preview, então todas as verificações dão `OK`.
- **CA-B46-12** (automática) — a empresa de teste nasce no banco de teste com um comando. Dado o banco de teste sem a empresa de teste, quando alguém roda o comando que cria a empresa de teste, então a "[TESTE] Automações B11" existe no banco de teste com os mesmos dados de partida da produção (Ana, Bruno e Carla, as conversas, a etiqueta "Interessado" e o admin no time Entrada), e o login dela é gravado no arquivo de ambiente do banco de teste.
- **CA-B46-13** (automática) — o reset volta a empresa de teste ao estado inicial no banco de teste. Dado a empresa de teste do banco de teste com dados criados por um roteiro, quando alguém roda o comando de reset, então ela volta ao estado inicial e a empresa de teste da produção não muda.
- **CA-B46-18** (automática) — os roteiros de envio rodam na produção. Dado a mudança no ar, quando alguém roda o roteiro B11-05 ou o B11-07 com um endereço de preview, então ele para antes de enviar e avisa "este roteiro envia mensagem de verdade: rode contra a produção", e com o endereço da produção ele usa a empresa "[TESTE]" da produção.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-04 | Os segredos do gateway e da Meta no preview continuam os mesmos de hoje: sem número conectado no banco de teste, o preview não envia nada | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-02 | O preview também usa o banco de teste ou só os testes automáticos? | respondida | O preview também (Marcelle, 27/10/2026) |
| PER-B46-03 | Onde fica a empresa "[TESTE] Automações B11"? | respondida | Nos dois bancos: no de teste, recriável pelo reset; na produção, só para teste com chip (Marcelle, 27/10/2026) |
| PER-B46-04 | Onde rodam os roteiros que mandam mensagem de verdade (B11-05 e B11-07)? | respondida | Na produção, na empresa "[TESTE]" de lá (Marcelle, 27/10/2026) |

## Cenários

### Happy Path
1. Na Vercel, as três variáveis do Supabase que valem **só para o Preview** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) passam a ter os valores do banco de teste. As de Production já são entradas separadas e não mudam.
2. O branch é enviado ao GitHub (só o branch, nunca o `master`) e a Vercel publica um preview novo, que já nasce no banco de teste.
3. `criar-empresa-teste.cjs` cria a "[TESTE] Automações B11" no banco de teste, com os mesmos dados de partida de hoje, e grava `B11_TESTE_EMAIL`, `B11_TESTE_SENHA` e `B11_TESTE_WORKSPACE_ID` no `.env.teste.local`.
4. Nos roteiros, `lerEnv(endereço)` do `comum.cjs` escolhe o banco pelo endereço: o da produção (`https://crm-exponencial.vercel.app`) usa o `.env` + `.env.local`, como hoje; qualquer outro endereço, ou nenhum, usa por cima as variáveis do Supabase e a empresa de teste do `.env.teste.local`. `abrirPreview(endereço)` entra com o login do banco certo.
5. O roteiro dos menus e o reset passam a rodar no banco de teste sem mudar o código deles.
6. `roteiro-b11-05.cjs` e `roteiro-b11-07.cjs` chamam `exigirProducao(endereço)` antes de qualquer coisa e leem o ambiente da produção.

### Edge Cases
- **Sem `.env.teste.local`** num comando que usa o banco de teste: para com "falta o arquivo .env.teste.local na raiz do projeto", em vez de cair na produção.
- **`.env.teste.local` apontando para a produção:** para com o erro da trava (`lerEnvTeste`).
- **Comandos sem endereço** (`resetar`, `criar`, `popular-empresa-teste-b36`, `conferir-b22-30-rls`, `tela.cjs`): passam a usar o banco de teste. É o mesmo banco do preview, onde os roteiros gravam.
- **Outros previews:** a troca vale para o preview de qualquer branch. Branch com migration nova precisa dela antes no banco de teste (`npm run db:teste:push`), o que já é a regra da série.
- **O arquivo do banco de teste pode ser outro** pela variável `ARQUIVO_ENV_TESTE` (o teste do CA-B46-12 usa uma cópia temporária).

### Cenário de Erro
- **Roteiro de envio com endereço de preview:** para antes de ler o banco ou abrir o navegador, com "este roteiro envia mensagem de verdade: rode contra a produção", e termina com erro.
- **`criar-empresa-teste.cjs` com a empresa já gravada no arquivo:** recusa como hoje ("use o resetar").

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-09 | automática | `src/test/banco-de-teste-preview.integration.test.ts` | no preview do branch (`endereco-preview.cjs` com o último commit enviado), entra como o admin da empresa de teste do banco de teste, cria uma etiqueta com nome único pela tela de Etiquetas e confere que ela existe no banco de teste e não existe na produção; apaga a etiqueta no fim |
| CA-B46-10 | manual | roteiro abaixo | a produção segue com os mesmos dados e o chat recebendo |
| CA-B46-11 | automática | `src/test/banco-de-teste-preview.integration.test.ts` | roda o `resetar-empresa-teste.cjs` e o `roteiro-menus.cjs` contra o preview e confere que todas as linhas dão `OK` e o roteiro termina sem erro |
| CA-B46-12 | automática | `src/test/banco-de-teste-preview.integration.test.ts` | com uma cópia do `.env.teste.local` sem a empresa de teste (`ARQUIVO_ENV_TESTE`), roda o `criar-empresa-teste.cjs` e confere no banco de teste a empresa com Ana, Bruno e Carla (cards em Lead na Entrada), as conversas da Ana e do Bruno, a etiqueta "Interessado" na do Bruno e o admin no time Entrada, e o login gravado na cópia; apaga essa empresa e o usuário no fim |
| CA-B46-13 | automática | `src/test/banco-de-teste-preview.integration.test.ts` | cria uma etiqueta e muda a etapa de um card da empresa de teste do banco de teste, roda o `resetar-empresa-teste.cjs` e confere a etiqueta apagada e o card em Lead; as etiquetas e os cards da empresa de teste da produção ficam iguais antes e depois |
| CA-B46-18 | automática | `src/test/banco-de-teste-preview.integration.test.ts` | `roteiro-b11-05.cjs` e `roteiro-b11-07.cjs` com um endereço de preview terminam com erro e a mensagem "este roteiro envia mensagem de verdade: rode contra a produção", sem abrir o navegador; `lerEnv` com o endereço da produção devolve o Supabase da produção e uma empresa `[TESTE]` de lá |

### Roteiro manual — CA-B46-10
1. Depois da troca na Vercel, entre em `https://crm-exponencial.vercel.app` com o seu login.
2. Confira que as empresas, os contatos e as conversas são os mesmos de antes.
3. Mande uma mensagem de outro celular para o número conectado e confira que ela chega no chat.

## Banco de Dados

Nenhuma mudança de schema. No banco de teste, nasce a empresa "[TESTE] Automações B11" com os dados de partida.

## Arquivos

- **Modificar:** `e2e/preview/comum.cjs` — `lerEnv(endereço)` escolhe o banco pelo endereço; `exigirProducao(endereço)`; `abrirPreview` usa o ambiente do endereço
- **Modificar:** `e2e/preview/criar-empresa-teste.cjs` — cria no banco de teste e grava o login no `.env.teste.local`
- **Modificar:** `e2e/preview/roteiro-b11-05.cjs` — recusa preview e usa o ambiente da produção
- **Modificar:** `e2e/preview/roteiro-b11-07.cjs` — recusa preview e usa o ambiente da produção
- **Modificar:** `e2e/preview/tela.cjs` — `moverCard` espera a fila no banco do endereço do roteiro
- **Modificar:** `e2e/preview/README.md` — qual banco cada comando usa
- **Criar:** `src/test/banco-de-teste-preview.integration.test.ts` — testes dos critérios desta issue

Fora do código: as três variáveis do Supabase do Preview na Vercel e o `.env` copiado para o worktree (fora do git).

## Checklist

- [x] Ler o banco certo pelo endereço no `comum.cjs`, com a recusa dos roteiros de envio
- [x] Criar a empresa de teste no banco de teste pelo `criar-empresa-teste.cjs`
- [x] Trocar as variáveis do Supabase do Preview na Vercel
- [x] Enviar o branch e esperar o preview novo
- [x] Atualizar o README dos roteiros
- [x] Rodar o `tsc` no projeto inteiro

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B46-10 | Marcelle | 28/10/2026 |
