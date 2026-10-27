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
