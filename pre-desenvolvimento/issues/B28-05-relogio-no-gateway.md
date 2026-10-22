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
