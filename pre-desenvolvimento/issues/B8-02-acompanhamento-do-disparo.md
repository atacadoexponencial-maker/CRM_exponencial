# B8-02: Acompanhamento do disparo

**Tipo:** Implementação
**Módulo:** B8 — Campanhas pelo Canal Direto
**Repositório:** `CRM_exponencial`

## Contexto

Pelo canal direto, um disparo pode levar horas. Durante todo esse tempo, a campanha
fica no estado "enviando" e o administrador não tem como saber se está andando. Hoje
não existe acompanhamento: a lista de campanhas mostra o estado, e o relatório só faz
sentido depois.

Esta issue dá visibilidade ao disparo em andamento: quanto já saiu, quanto falta, e
quanto está parado na fila do gateway.

## O que construir

1. **Progresso do disparo**: enviados, falhados e pendentes sobre o total.
2. **Quantidade na fila** do gateway, que é diferente de "pendente no CRM" — a mensagem
   já foi aceita pelo gateway e espera a vez de sair.
3. **Atualização enquanto a tela está aberta**, sem obrigar o usuário a recarregar.

## Comportamentos da spec cobertos

- [ ] Ver o progresso do disparo em andamento
- [ ] Ver quantas mensagens ainda estão na fila

## Contrato do gateway

- Consulta de fila (seção 4.4):
  `GET /v1/instances/{id}/queue/{message_id}` → `{ queue_position, estimated_send_at, state }`,
  com `state` em `queued`, `deferred`, `sent`, `discarded`. **É por mensagem, não por
  campanha** — consultar uma por uma para milhares de destinatários não serve.
- A resposta do envio já traz `queue_position` e `estimated_send_at` no momento em que a
  mensagem é aceita. Guardar isso no envio é mais barato do que consultar depois.
- O evento `instance.braked` traz `queued_count`, a quantidade parada naquele número.
- **Consequência de desenho, a resolver no plano:** o "quantas estão na fila" da spec
  pode ser respondido com o que o CRM já sabe (destinatários aceitos pelo gateway e
  ainda sem status `sent`) em vez de por consulta ao gateway. Se a conclusão for que
  falta um endpoint de fila por instância, isso é pedido ao gateway e **não** se resolve
  aqui.
- `deferred` significa fora da janela de envio, não erro — a interface precisa dizer
  "aguardando o horário de envio", e não "com problema".

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` e
  `page.tsx` — é a tela que já mostra o resultado por destinatário; o progresso do
  disparo em andamento cabe nela.
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — a lista pode mostrar
  o progresso resumido da campanha em andamento.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — a contagem vem do backend,
  agregada, e não somando linhas no cliente.
- **Consultar:** `supabase/migrations/20260612000001_create_campaigns.sql` —
  `campaign_recipients.status` aceita `pendente`, `enviado`, `entregue`, `lido`,
  `falhou`. Não existe estado para "aceita pelo gateway e ainda na fila"; decidir no
  plano se `enviado` cobre isso ou se falta um valor, e nesse caso a migration entra
  aqui.
- **Consultar:** `src/lib/campanhas.ts` — o laço de disparo é onde
  `queue_position` e `estimated_send_at` poderiam ser guardados, se o plano decidir
  guardá-los.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B7-03 — a campanha com número de origem.
- B6-04 — sem o evento de status, nada sai de "enviado" e o progresso nunca avança.

## Critérios de aceite

- [ ] Uma campanha em andamento mostra quantas mensagens saíram, quantas falharam e
      quantas faltam, sobre o total de destinatários.
- [ ] Mostra quantas estão esperando a vez de sair pelo gateway.
- [ ] Mensagem adiada por estar fora da janela de envio aparece como aguardando
      horário, e não como falha.
- [ ] Os números batem com `campaign_recipients` ao fim do disparo.
- [ ] A tela atualiza sozinha enquanto está aberta, sem recarregar.
- [ ] Campanha pela Meta continua exibindo o que exibia, sem campo vazio ou estimativa
      sem sentido.
- [ ] A contagem é feita no backend.

## Fora de escopo

- Interromper e retomar a campanha — é B8-03.
- Motivo de cada mensagem não enviada no relatório — é B8-04.
- Consultar a fila do gateway mensagem por mensagem.
