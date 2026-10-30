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
