# B23-05: Mensagem editada ou apagada pelo contato aparece assim no chat

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Para número em uso também no celular, a Meta avisa quando o contato edita ou apaga uma mensagem já recebida. O CRM atualiza a mensagem no chat: texto novo com a marca "editada", ou "Mensagem apagada" no lugar do conteúdo.

## Pronto quando

Numa conversa aberta, uma mensagem recebida muda de texto e ganha a marca "editada" quando o contato edita, e vira "Mensagem apagada" quando ele apaga.

## Critérios de aceite

- **CA-B23-24** (automática) — Mensagem editada pelo contato aparece editada. Dado uma mensagem recebida já exibida no chat, quando a Meta avisa que o contato a editou, então o chat mostra o texto novo com a marca "editada".
- **CA-B23-25** (automática) — Mensagem apagada pelo contato aparece como apagada. Dado uma mensagem recebida já exibida no chat, quando a Meta avisa que o contato a apagou, então o chat mostra "Mensagem apagada" no lugar do conteúdo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-09 | Edição e exclusão de mensagem pelo contato valem só para números em uso no celular; os outros números continuam como hoje. | confirmada | Marcelle, 10/10/2026. |

## Perguntas em aberto

Nenhuma.
