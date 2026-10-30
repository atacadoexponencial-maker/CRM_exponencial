# B54-03: Escolher o número da campanha na etapa da mensagem

**Tipo:** Implementação
**Página:** Campanhas > editor, etapa 2
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

O seletor "Enviar pelo número" sai da etapa 3 e vira o primeiro campo da etapa 2. A gravação, a estimativa e o aviso das 24 horas continuam iguais; a etapa 3 fica só com agendamento e estimativa.

## Pronto quando

Numa campanha, o número é escolhido antes de escrever a mensagem, e a etapa 3 mostra a estimativa para o número escolhido sem o seletor.

## Critérios de aceite

- **CA-B54-11** (automática) — O número é escolhido na etapa da mensagem. Dado uma empresa com dois números conectados, quando o Admin abre a etapa 2 de uma campanha, então "Enviar pelo número" é o primeiro campo dela, a etapa 3 não o tem mais, e o número escolhido fica gravado na campanha e vale para a estimativa da etapa 3 (a mesma gravação de hoje).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-05 | Campanhas em rascunho ou agendadas de antes continuam com o número que já tinham; só o lugar do seletor muda. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.
