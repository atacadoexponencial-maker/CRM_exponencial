# B8-04: Relatório de entrega com motivo

**Tipo:** Implementação
**Módulo:** B8 — Campanhas pelo Canal Direto
**Repositório:** `CRM_exponencial`

## Contexto

O relatório de entrega mostra hoje o estado de cada destinatário, mas quando algo falha
ele diz apenas "falhou". Pelo canal direto os motivos são variados e acionáveis —
número sem WhatsApp, número freado, arquivo grande demais, disparo interrompido — e cada
um pede uma reação diferente do operador.

Hoje o motivo é perdido no caminho: `enviarParaDestinatario`
(`src/lib/campanhas.ts`) recebe `{ ok: false, motivo }` do provider, descarta o
`motivo` e grava só `status: "falhou"`.

## O que construir

1. **Guardar o motivo** da falha no destinatário, em vez de descartá-lo.
2. **Exibir o motivo** no relatório, em linguagem que o operador entenda.
3. **Distinguir "não saiu" de "saiu e falhou"**: interrompida, adiada e recusada não são
   a mesma coisa.

## Comportamentos da spec cobertos

- [ ] Ver no relatório de entrega quais mensagens não saíram e por quê

## Contrato do gateway

Os `error.code` que chegam a um destinatário de campanha, e o que cada um significa
para quem lê o relatório:

| `code` | O que dizer ao operador |
|---|---|
| `recipient_not_on_whatsapp` | o número não tem WhatsApp |
| `instance_not_connected` | o número de envio estava fora do ar |
| `instance_banned` | o número de envio foi banido |
| `instance_braked` | os envios do número estavam interrompidos |
| `media_too_large` | o arquivo passou do limite (a mensagem do gateway informa o limite) |
| `media_type_unsupported` | tipo de arquivo que o WhatsApp não aceita |
| `invalid_payload` | erro nosso, não do cliente — precisa aparecer como falha técnica |

Do evento `message.status`: `failed` traz `error` com `{ code, message }`. `message` é
legível e pode ser mostrado ao atendente — é a origem do texto, sem precisar de tradução
própria no CRM.

**Fora da janela de envio não é falha:** a mensagem foi aceita e adiada
(`state: "deferred"`). Mostrar isso como erro é bug.

## Arquivos

- **Criar:** migration em `supabase/migrations/` — motivo da falha em
  `campaign_recipients`. O schema atual
  (`supabase/migrations/20260612000001_create_campaigns.sql:23-34`) tem `status`,
  `wamid` e `atualizado_em`, e nenhum campo de motivo.
- **Modificar:** `src/lib/campanhas.ts` — `enviarParaDestinatario` passa a devolver o
  motivo, e `processarCampanha` passa a gravá-lo. Hoje o `motivo` do provider é
  descartado e o `catch` de rede devolve `{ ok: false, wamid: null }` sem explicação.
- **Modificar:** o tratamento de `message.status` da B6-04 — `failed` grava o motivo
  vindo do evento, não só o status.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` e
  `page.tsx` — a coluna de motivo e o agrupamento por motivo, se o plano achar útil.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — os dados do relatório vêm
  prontos do backend.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B6-04 — o `failed` com motivo chega por evento.
- B8-03 — "não saiu porque a campanha foi interrompida" só existe depois dela.

## Critérios de aceite

- [ ] Cada destinatário que falhou mostra o motivo, em português e compreensível.
- [ ] Número sem WhatsApp, número freado e arquivo grande demais aparecem como motivos
      distintos.
- [ ] Destinatário que não foi enviado porque a campanha foi interrompida aparece como
      não enviado, com esse motivo, e não como falha do número.
- [ ] Mensagem adiada por horário não aparece como falha.
- [ ] Falha técnica nossa aparece como falha técnica, sem culpar o número do cliente.
- [ ] Campanha pela Meta continua com o relatório funcionando, com motivo quando houver
      e sem quebrar quando não houver.
- [ ] Nenhum `error.code` cru aparece na tela.
- [ ] `npm run build`, `npm run lint` e os testes passam.

## Fora de escopo

- Reenviar as mensagens que falharam.
- Exportar o relatório.
- Métricas de resposta da campanha.
