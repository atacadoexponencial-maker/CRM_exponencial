# F1-02: Auditor da prova e testes com o código do critério

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (auditor, etapa de testes)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

## Descrição

Nasce o auditor: um conferidor que roda sozinho e diz se uma issue, ou uma série
inteira, está alinhada. Nesta issue ele confere a prova e os registros: critério sem
teste, critério sem prova (teste falhou ou foi pulado), teste órfão, critério fora de
issue, suposição aberta, pergunta aberta, seção ausente, teste manual pendente e issue no
formato antigo. Aceita exceção escrita na issue (motivo, quem aprovou e o dia) e a mostra
no relatório. A etapa de testes passa a escrever os testes a partir da tabela Prova, com
o código do critério no nome do teste; issue no formato antigo continua pelo plano de
testes por módulo.

Cobre os módulos 5 e 6 da spec, menos os problemas "arquivo fora da issue", "arquivo não
tocado", "checklist incompleto" e "regra violada", que ficam na F1-03.

Depende de F1-01.

## Pronto quando

Com uma issue de exemplo no formato novo: o auditor responde **alinhada** quando todo
critério automático tem teste passando; tirando o código de um teste, ele acusa
"critério sem teste"; pulando um teste, acusa "critério sem prova"; deixando uma
suposição aberta, acusa "suposição aberta"; com um critério manual sem confirmação,
responde **alinhada com teste manual pendente** e mostra o roteiro; depois de registrar
a confirmação (quem e quando), responde **alinhada**. Em uma issue antiga (ex.: B13-05),
ele avisa que o formato é antigo e não trava. "O que estamos assumindo?" lista as
suposições abertas.
