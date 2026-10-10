# F1-05: Fechamento da issue e lições aprendidas

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (`/issue`, `/spec`, `/plan`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

## Descrição

O `/issue` só move a issue para a pasta de concluídas quando o auditor diz **alinhada**;
com teste manual pendente, ela fica aberta mesmo com o código no ar. Ao fechar, o projeto
pode registrar lições no arquivo de lições versionado: no máximo duas por issue, cada uma
citando a falha real que a originou (problema do auditor, teste que falhou, problema do
`/revisildo` ou erro achado em teste manual). Lição sem falha de origem é recusada;
caminho limpo não gera lição. A mesma falha em outra série marca a lição como recorrente.
O `/spec` e o `/plan` passam a ler no máximo dez lições, as recorrentes primeiro. A
pessoa pode mandar remover uma lição errada.

Cobre o módulo 9 da spec e o comportamento "ler as lições" dos módulos 1 e 3.

Depende de F1-04.

## Pronto quando

Fechando uma issue de exemplo que teve um problema apontado pelo auditor no caminho: a
lição é aceita e aparece no arquivo de lições com a issue e a falha de origem; uma lição
sem falha é recusada; a terceira lição da mesma issue é recusada. Rodando `/spec` e
`/plan` depois, a lição aparece entre as lidas. Uma issue com teste manual pendente não
é movida para concluídas.
