# B11-03: Histórico de execuções e proteção contra disparo repetido

**Tipo:** Implementação
**Página:** Configurações → Automações → Histórico; Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02

## Descrição

Toda avaliação de regra vira um registro: concluída, ignorada pela proteção ou
falhou, com o caminho percorrido (a saída tomada em cada condição e o
resultado de cada ação) e o motivo de cada falha em português. A regra
ganha a proteção de repetição (uma vez por contato, uma vez a cada N horas por
contato, ou sempre), aplicada pelo motor. A página de Histórico lista as
execuções dos últimos 30 dias com filtros por regra, resultado e período, e
abre o detalhe de cada uma, inclusive de regras já excluídas.

Cobre "Histórico" inteira e, no "Motor", registrar execuções e respeitar a
proteção.

## Pronto quando

Uma regra "uma vez por contato" disparada duas vezes para o mesmo contato
aparece no histórico como concluída e depois como ignorada, com o motivo. Uma
ação apontando para uma etiqueta apagada aparece como falhou, com o motivo, e
as ações seguintes no caminho aparecem como concluídas.
