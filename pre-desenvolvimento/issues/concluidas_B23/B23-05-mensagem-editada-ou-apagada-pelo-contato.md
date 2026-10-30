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

## Cenários

### Happy Path
1. O contato edita uma mensagem no WhatsApp (até 15 minutos depois de mandar). A Meta avisa pelo webhook `messages` com `type: "edit"` e `edit: { original_message_id, message: { type, text|image|… } }`. Só acontece em número em uso no celular (SUP-B23-09).
2. O webhook da Meta, ao ver `type: "edit"` numa conexão em uso no celular, não cria mensagem nova: acha a original pelo `wamid` (só na empresa do número) e grava o texto novo com `edited_at` (`aplicarAvisoDeSistema`, B6-03). Se a original é mídia, o que muda é a legenda (`media_caption`), e o arquivo fica.
3. O contato apaga uma mensagem (até 2 dias depois). A Meta avisa com `type: "revoke"` e `revoke: { original_message_id }`. O CRM marca `deleted_at` na original; a mensagem nunca é removida.
4. O Chat passa a mostrar as duas marcas, em qualquer canal (o canal direto já gravava `edited_at`/`deleted_at` desde a B6-03, mas a tela nunca as exibiu): mensagem apagada aparece como "Mensagem apagada", em itálico, no lugar do conteúdo; mensagem editada mostra o texto novo e a marca "editada" ao lado do horário.

### Edge Cases
- Aviso de edição ou exclusão de mensagem que o CRM não tem (anterior à conexão): nada a atualizar, e o webhook responde 200.
- Aviso repetido: a segunda gravação deixa a mensagem igual.
- Número que não está em uso no celular recebe `edit`/`revoke`: continua como hoje (SUP-B23-09).
- Edição de mídia: a nova legenda substitui a antiga; sem legenda nova, a antiga some.
- A edição e a exclusão não disparam automação, não somam não lidas nem mudam a prévia da conversa: a mensagem não é nova.

### Cenário de Erro
- Falha de banco ao atualizar: o webhook responde 200 mesmo assim (o aviso é sobre mensagem antiga; a Meta não precisa reentregar), e o erro vai para o log.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-24 | automática | `src/test/edicao-pelo-contato.integration.test.ts` e `src/test/edicao-pelo-contato.test.tsx` | Depois do webhook `edit`, a mensagem gravada tem o texto novo e `edited_at`, nenhuma mensagem nova nasce, e `buscarMensagens` a devolve como editada; o balão mostra o texto novo com a marca "editada". |
| CA-B23-25 | automática | `src/test/edicao-pelo-contato.integration.test.ts` e `src/test/edicao-pelo-contato.test.tsx` | Depois do webhook `revoke`, a mensagem tem `deleted_at`, continua no banco, `buscarMensagens` a devolve como apagada, e o balão mostra "Mensagem apagada" no lugar do conteúdo. |

## Arquivos

- **Criar:** `src/lib/whatsapp/edicao-pelo-contato.ts` — `aplicarEdicaoOuExclusaoDaMeta`: traduz `edit`/`revoke` da Meta e aplica com `aplicarAvisoDeSistema` de `@/lib/whatsapp/recebimento` (legenda quando a original é mídia).
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — a conexão do caminho de mensagens é lida com `em_uso_no_celular`; `edit` e `revoke` vão para a lib em vez de virar mensagem nova.
- **Modificar:** `src/app/(auth)/chat/mock-mensagens.ts` — `Mensagem` ganha `editada?: boolean` e `apagada?: boolean`.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `buscarMensagens` lê `edited_at` e `deleted_at` e preenche as duas marcas.
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — "Mensagem apagada" no lugar do conteúdo e a marca "editada" ao lado do horário.
- **Criar:** `src/test/edicao-pelo-contato.integration.test.ts` — CA-B23-24 e CA-B23-25 contra o banco de teste, webhook assinado (padrão de `src/test/eco-do-celular.integration.test.ts`), e `buscarMensagens` com o navegador do Admin.
- **Criar:** `src/test/edicao-pelo-contato.test.tsx` — o balão com cada marca.

## Dependências Externas

- Meta webhook `messages` com `type: "edit"` (`edit.original_message_id`, `edit.message`) e `type: "revoke"` (`revoke.original_message_id`), referência lida em 30/10/2026.

## Checklist

- [x] `edicao-pelo-contato.ts` aplica edição (texto ou legenda) e exclusão pela `wamid`, só na empresa do número
- [x] Webhook despacha `edit`/`revoke` em número em uso no celular, sem criar mensagem nem disparar automação
- [x] `Mensagem` com `editada`/`apagada`, `buscarMensagens` preenchendo e o balão mostrando as marcas
- [x] `tsc` sem erro (L-07) e os testes do balão e do webhook passando (L-05); `chat-documento-nome-e-previa.test.tsx` (miniatura do gateway) já falhava antes da B23, em código que ela não toca
