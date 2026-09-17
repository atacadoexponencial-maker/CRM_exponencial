# B6-01: Receptor de eventos do gateway

**Tipo:** Implementação
**Módulo:** B6 — Recebimento de Eventos do Gateway
**Repositório:** `CRM_exponencial`

## Contexto

O gateway entrega tudo o que acontece num número — mensagem recebida, status de
entrega, mudança de estado da instância, freio — chamando um endereço HTTP do CRM. Hoje
esse endereço não existe.

Esta issue constrói a **porta de entrada**: a rota, a conferência de que o evento veio
mesmo do nosso gateway e o descarte de evento repetido. O que fazer com o conteúdo de
cada tipo de evento é das issues B6-02, B6-03 e B6-04 — aqui a rota apenas reconhece o
envelope e encaminha.

Vale construir antes da B2, com evento simulado: nada aqui depende de número conectado.

## O que construir

1. **Rota própria do gateway**, separada da rota da Meta. O webhook da Meta
   (`src/app/api/webhooks/whatsapp/route.ts`) **não é alterado por esta issue** — dois
   canais, duas portas, nenhum risco de quebrar o que já funciona em produção.
2. **Validação da assinatura** sobre o corpo bruto, antes de qualquer parse, em tempo
   constante. Assinatura inválida responde `401`.
3. **Registro de eventos já processados**, para ignorar reentrega do mesmo evento.
4. **Despacho por tipo**, com tipo desconhecido respondido com `2xx` e registrado, sem
   quebrar.

## Comportamentos da spec cobertos

- [ ] Recusar evento com assinatura inválida
- [ ] Ignorar evento já processado anteriormente

## Contrato do gateway

Envelope comum a todos os eventos (seção 2 do contrato):

```json
{
  "event_id": "evt_01HZX9M4K2QWERTY",
  "type": "message.received",
  "instance_id": "inst_01HZX8P7A3",
  "timestamp": "2026-09-10T14:32:07.412Z",
  "data": { }
}
```

- `type` é um de `message.received`, `message.status`, `instance.state`,
  `instance.braked`.
- `instance_id` ocupa o lugar que o `phone_number_id` da Meta ocupa hoje: é por ele
  que o CRM descobre o workspace, cruzando com o identificador de instância gravado em
  `whatsapp_connections` (coluna criada na B1-02).
- **`event_id` é estável entre reentregas.** É exatamente assim que o CRM ignora
  repetido: o gateway reenvia o mesmo evento, com o mesmo `event_id`, quando o CRM não
  responde `2xx`.
- Assinatura: header `X-Gateway-Signature-256: sha256=<hex>`, que é
  `HMAC-SHA256(corpo_bruto, segredo)`, hexadecimal minúsculo. É o **mesmo esquema** do
  `X-Hub-Signature-256` da Meta.
- **Resposta esperada:** `2xx` confirma o recebimento. Qualquer outra resposta faz o
  gateway reenfileirar, **exceto `401`** — nesse caso ele registra a falha e para de
  tentar. Ou seja: responder `401` por engano faz o CRM perder o evento de vez.
- Ordem garantida **por conversa**, não globalmente.

## Arquivos

- **Criar:** `src/app/api/webhooks/gateway/route.ts` — a rota. Precisa ler o corpo
  bruto antes do parse, como `src/app/api/webhooks/whatsapp/route.ts:35` já faz.
- **Criar ou modificar:** a função de validação de assinatura. A que existe é
  `assinaturaValida()` em `src/app/api/webhooks/whatsapp/route.ts:8`, é privada do
  arquivo e já faz HMAC-SHA256 com `timingSafeEqual`. Extrair para um módulo
  compartilhado, com o segredo e o header como parâmetro, é reuso; copiar não é.
  Atenção: a versão de hoje **aceita tudo quando o segredo não está configurado**
  (`if (!appSecret) return true`) — para o gateway isso não vale, segredo ausente é
  recusa.
- **Criar:** migration em `supabase/migrations/` para o registro de eventos
  processados, com o `event_id` como chave única.
- **Criar:** teste em `src/test/`, com banco mockado, conforme
  `pre-desenvolvimento/testes/plano-testes-B1.md`.

Variável de ambiente nova: o segredo da assinatura, que é o mesmo valor configurado no
gateway (`GATEWAY_WEBHOOK_SECRET`). Só no backend.

## Depende de

- B1-02 — a coluna com o identificador da instância em `whatsapp_connections`, usada
  para resolver o workspace. Enquanto ela não existir, dá para construir a rota e a
  assinatura, mas não o encaminhamento completo.

## Critérios de aceite

- [ ] Evento com assinatura correta responde `2xx`.
- [ ] Evento com assinatura errada, ausente, ou com o segredo não configurado responde
      `401` e não escreve nada no banco.
- [ ] A comparação da assinatura é feita sobre o corpo bruto, antes do parse, em tempo
      constante.
- [ ] O mesmo `event_id` entregue duas vezes é processado uma vez, e a segunda entrega
      responde `2xx` (e não erro — erro faria o gateway reenviar para sempre).
- [ ] `instance_id` desconhecido responde `2xx` sem escrever nada, no mesmo espírito do
      webhook da Meta, que responde `ok` quando não encontra a conexão.
- [ ] `type` desconhecido responde `2xx` sem quebrar.
- [ ] O webhook da Meta continua byte a byte o que era: `git diff` não mostra
      `src/app/api/webhooks/whatsapp/route.ts` alterado, exceto pela extração da
      função de assinatura, se for por esse caminho.
- [ ] O segredo não aparece em log nem em resposta.

## Fora de escopo

- Tratar o conteúdo de qualquer evento — é B6-02, B6-03 e B6-04.
- Fila ou processamento assíncrono do evento. O gateway já reenfileira o que falha; o
  CRM responde na hora.
- Painel de eventos recebidos.
