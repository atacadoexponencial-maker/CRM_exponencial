# B53-05: "Lido" nas campanhas não volta e nenhum aviso da Meta se perde

**Tipo:** Implementação
**Página:** Campanhas — leitura
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O webhook da Meta passa a ler todos os avisos de cada pacote e a nunca fazer o status voltar (nem no destinatário da campanha nem na mensagem do Chat).

## Pronto quando

O relatório da campanha pela API Oficial mostra "Lido" depois que a mensagem é aberta.

## Critérios de aceite

- **CA-B53-08** (automática) — "Lido" não volta para "Entregue". Dado um destinatário de campanha já marcado como lido, quando chega um aviso de "entregue" atrasado, então o destinatário continua lido, e a mensagem no Chat continua com o tique de lida.
- **CA-B53-09** (automática) — Todos os avisos do pacote são gravados. Dado um aviso da Meta com dois destinatários em blocos diferentes do mesmo pacote, quando o CRM recebe o aviso, então os dois destinatários têm o status atualizado.
- **CA-B53-10** (manual) — Leitura aparece no relatório da API Oficial. Dado uma campanha enviada pelo número da API Oficial a um celular com confirmação de leitura ligada, quando a mensagem é aberta no celular, então em até 1 minuto o relatório mostra "Lido" e Lidos 1.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-01 | Na ordem dos status, só se avança (enviado → entregue → lido); "falhou" pode chegar depois de "enviado", mas nunca depois de "entregue" ou "lido". | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A Meta manda um pacote de avisos (`entry[]` → `changes[]` → `value.statuses[]`).
2. O webhook percorre **todas** as entradas e todas as mudanças do pacote, não só `entry[0].changes[0]`.
3. Para cada aviso (`delivered`, `read`, `failed`), atualiza a mensagem do Chat (`messages`) e o destinatário da campanha (`campaign_recipients`) pelo `wamid`, só se o status novo for à frente do gravado.

### Edge Cases
- "Entregue" atrasado chegando depois de "lido": nada muda (nem na mensagem nem no destinatário).
- "Falhou" chegando depois de "entregue" ou "lido": nada muda (SUP-B53-01). Depois de "enviado", grava "falhou".
- Status ainda vazio (`null`) na mensagem: o aviso grava normalmente.
- Pacote com mensagens recebidas em mais de uma mudança: todas são gravadas, cada uma com o número (`phone_number_id`) e os contatos da sua mudança.
- Mudança sem `phone_number_id`: pulada, as outras seguem.

### Cenário de Erro
- Status desconhecido (ex.: `sent`, que o mapa da Meta não traduz): ignorado, como hoje.
- Erro de banco ao gravar mensagem recebida: responde 500, como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-08 | automática | `src/test/webhook-whatsapp-status.integration.test.ts` | destinatário e mensagem marcados "lido" continuam "lido" depois de um aviso "delivered" atrasado; "failed" depois de "lido" também não muda |
| CA-B53-09 | automática | `src/test/webhook-whatsapp-status.integration.test.ts` | pacote com destinatários em blocos diferentes (duas `changes` e duas `entry`) atualiza todos |
| CA-B53-10 | manual | roteiro abaixo | o relatório mostra "Lido" e Lidos 1 |

### Roteiro manual — CA-B53-10
1. Na empresa "[TESTE] Automações B11" de produção, crie uma campanha com o número da API Oficial (+55 11 95504-6911) para um contato cujo celular tem a confirmação de leitura ligada.
2. Envie a campanha e abra a mensagem no celular.
3. Em até 1 minuto, o relatório de entrega da campanha mostra o destinatário como "Lido" e o contador Lidos 1 (e não volta para "Entregue" ao recarregar).

## Banco de Dados

Nenhuma mudança de schema. Usa `messages.status` e `campaign_recipients.status` como hoje.

## Arquivos

- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — percorre todas as `entry`/`changes`; grava o status só quando é à frente do atual (filtro `status is null or status not in (...)`)
- **Criar:** `src/test/webhook-whatsapp-status.integration.test.ts` — CA-B53-08 e CA-B53-09 no banco de teste, chamando o `POST` do webhook com assinatura válida
- **Modificar:** `src/test/mensagens.integration.test.ts` — o banco simulado dos testes da Issue 28 (status de entrega) ganha o `or` do filtro novo; o que eles conferem não muda

Reuso: `assinaturaHmacValida` (o teste assina como `webhook-whatsapp-automacoes.test.ts`), `createServiceClient`.

## Checklist

- [x] Percorrer todas as `entry` e `changes` do pacote, para status e para mensagens recebidas
- [x] Gravar o status só quando ele é à frente do atual (entregue não sobrescreve lido; falhou não sobrescreve entregue nem lido)
- [x] Teste de integração dos CA-B53-08 e CA-B53-09
