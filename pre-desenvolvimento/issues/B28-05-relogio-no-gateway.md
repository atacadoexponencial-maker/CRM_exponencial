# B28-05: Gateway chama o relógio das esperas a cada 15 segundos

**Tipo:** Implementação
**Página:** Gateway — relógio das automações
**Repositório:** `whatsapp-gateway` (série A11 no repositório do gateway)
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

O gateway, que já roda o tempo todo e já tem relógios próprios, passa a chamar a rota do
relógio do CRM (B28-02) a cada 15 segundos, com o segredo combinado. Uma chamada que falha
não para as seguintes. Sem o endereço ou o segredo configurado, o relógio fica desligado.

## Pronto quando

Com a versão nova do gateway no servidor e a variável configurada nos dois lados, uma regra
com "esperar 1 minuto" entre duas mensagens, no número de teste, entrega a segunda mensagem
ao gateway entre 1 minuto e 1 minuto e 30 segundos depois da primeira.

## Critérios de aceite

- **CA-B28-26** (automática) — O gateway chama o relógio a cada 15 segundos. Dado o gateway configurado com o endereço e o segredo do relógio, quando ele está no ar, então chama o relógio do CRM a cada 15 segundos, e uma chamada que falha não para as seguintes (issue no repositório do gateway, série A11).
- **CA-B28-08** (manual) — A pausa curta segue em até 30 segundos depois da hora. Dado uma regra com "esperar 1 minuto" entre duas mensagens, no número de teste conectado, quando o gatilho dispara, então a segunda mensagem é entregue ao gateway entre 1 minuto e 1 minuto e 30 segundos depois da primeira.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-05 | A precisão de 30 segundos (CA-B28-08) vale com o gateway no ar e conta até o CRM entregar a mensagem ao gateway, que segura os envios na fila dele (como decidido na B11-09). | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-03 | Quem acorda as esperas de tempo? | respondida | O whatsapp-gateway, a cada 15 segundos (Luan, 20/10/2026). Descartados: Vercel Pro (US$ 20/mês, 1 por minuto) e serviço externo de cron (mais uma conta para manter). |

## Cenários

### Happy Path
1. No repositório `whatsapp-gateway`, a issue A11-01 (branch `a11-01-relogio-das-automacoes`, commit 2a71e2d) liga um relógio que chama `POST /api/automacoes/relogio` do CRM na subida e a cada 15 segundos.
2. A chamada vai assinada como os eventos do gateway: HMAC-SHA256 do corpo com `GATEWAY_WEBHOOK_SECRET`, no header `X-Gateway-Signature-256` (PER-B28-09). A rota do CRM (B28-02) confere com a mesma função do webhook.
3. O CRM segue as esperas vencidas; a mensagem depois da espera vai para a fila do gateway.

### Edge Cases
- Sem `CRM_RELOGIO_URL` no gateway, o relógio fica desligado e o log da subida diz isso.
- Chamada que ainda não voltou quando chega a vez seguinte: a vez é pulada.
- A rota só existe na produção do CRM depois do merge do branch da B28. Até lá, `CRM_RELOGIO_URL` fica vazia no servidor do gateway.

### Cenário de Erro
- CRM fora, tempo limite ou resposta que não é 2xx: a falha vai para o log do gateway e a chamada seguinte sai na hora dela. As esperas de tempo atrasam e seguem quando o CRM volta (fora de escopo: avisar).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-26 | automática | `whatsapp-gateway/src/relogio/relogio-automacoes.test.ts` | a primeira chamada sai na subida e as seguintes a cada 15 s; uma que falha (sem resposta ou erro 500) não para as seguintes; a chamada vai assinada com o HMAC do corpo |
| CA-B28-08 | manual | roteiro abaixo | a segunda mensagem chega ao gateway entre 1 min e 1 min 30 s depois da primeira |

### Roteiro manual — CA-B28-08
Depois do merge do branch da B28 no CRM e com `CRM_RELOGIO_URL=https://crm-exponencial.vercel.app/api/automacoes/relogio` no servidor do gateway (versão com a A11-01):
1. No CRM, na empresa de teste com o número de teste conectado pelo canal direto, crie a regra: gatilho "mensagem recebida" → enviar "primeira" → esperar 1 minuto → enviar "segunda"; repetição "uma vez por contato".
2. Do celular de teste, mande uma mensagem para o número conectado.
3. No histórico da automação, a execução fica "Esperando: 1 minuto, desde HH:MM".
4. Anote a hora em que "primeira" e "segunda" chegam no celular (ou a hora de entrada na fila no log do gateway).
5. Confira: a diferença fica entre 1 min e 1 min 30 s, e a execução fica "Concluída", com "Saiu por: depois de 1 minuto".

## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_TESTE | CA-B28-26 | Provado no repositório do gateway, por `src/relogio/relogio-automacoes.test.ts` (A11-01, commit 2a71e2d, 3 de 3 testes); o auditor só lê os testes do CRM | Luan | 25/10/2026 |

## Arquivos

Nenhum arquivo do CRM. O código é do `whatsapp-gateway` (A11-01):

- `src/relogio/relogio-automacoes.ts`, `src/relogio/relogio-automacoes.test.ts`, `src/env.ts`, `src/index.ts`, `.env.example`, `infra/wagw.yml`

## Checklist

- [x] A11-01 no gateway: relógio de 15 s, chamada assinada, `CRM_RELOGIO_URL` opcional
- [x] Teste do CA-B28-26 no gateway
