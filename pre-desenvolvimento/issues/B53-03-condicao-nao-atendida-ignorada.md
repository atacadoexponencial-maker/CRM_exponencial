# B53-03: Condição não atendida aparece como "Ignorada" no Histórico

**Tipo:** Implementação
**Página:** Automações — histórico
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Execução que para numa condição falsa sem saída "não" ligada passa a ser gravada como "Ignorada" com o motivo, em vez de "Concluída —".

## Pronto quando

O Histórico mostra "Ignorada — Condição não atendida: <nome>" nesses casos.

## Critérios de aceite

- **CA-B53-06** (automática) — Condição não atendida aparece como Ignorada. Dado uma automação cuja condição deu "não" e a saída "não" não está ligada a nenhum bloco, quando a execução termina, então o Histórico mostra "Ignorada" com o motivo "Condição não atendida: <nome da condição>".

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
