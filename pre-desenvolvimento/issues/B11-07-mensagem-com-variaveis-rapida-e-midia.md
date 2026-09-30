# B11-07: Ação enviar mensagem com variáveis, mensagem rápida e mídia

**Tipo:** Implementação
**Página:** Editor de fluxo; Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

## Descrição

A ação de mensagem ganha três formas: texto com variáveis {{nome_contato}},
{{nome_vendedor}} e {{primeiro_nome}}; uma mensagem rápida cadastrada; ou uma
imagem ou documento escolhido no editor e guardado no armazenamento. O envio
usa o número da conversa do contato e respeita o canal (mídia só onde o canal
suporta; caso contrário a ação falha com motivo no histórico).

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), uma regra envia "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}"
com os nomes certos, outra envia a mensagem rápida escolhida, e outra envia
um PDF; o histórico mostra as três como concluídas.
