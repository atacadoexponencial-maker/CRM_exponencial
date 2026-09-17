# B8-03: Interromper e retomar campanha

**Tipo:** Implementação
**Módulo:** B8 — Campanhas pelo Canal Direto
**Repositório:** `CRM_exponencial`

## Contexto

Num disparo de horas, parar no meio deixa de ser luxo: o administrador vê que o texto
está errado, ou que as respostas vieram ruins, e precisa interromper antes de queimar o
número. E se o gateway acionar o freio de emergência daquele número, a campanha **tem**
que parar sozinha — insistir é o caminho mais rápido para o banimento.

Hoje a campanha só tem `cancelada`
(`supabase/migrations/20260612000001_create_campaigns.sql:10`), que é ponto final: não
existe "pausada" nem retomada.

## O que construir

1. **Interrupção manual** de uma campanha em andamento, preservando o que já saiu.
2. **Retomada** de onde parou, sem reenviar para quem já recebeu.
3. **Interrupção automática** quando o número usado é freado pelo gateway, com o motivo
   visível.

## Comportamentos da spec cobertos

- [ ] Interromper uma campanha em andamento
- [ ] Retomar uma campanha interrompida
- [ ] Ver a campanha ser interrompida automaticamente quando o número é freado

## Contrato do gateway

- Evento `instance.braked` (seção 3.4):
  `{ reason, queued_count, released }`, com `reason` em `banned`, `failure_rate`,
  `manual`, e `released: true` marcando a liberação. `queued_count` diz quantas
  mensagens ficaram paradas — é o número que o aviso ao usuário deve citar.
- Envio pedido com o número freado é recusado com `error.code = instance_braked`;
  com o número banido, `instance_banned`; desconectado, `instance_not_connected`. A
  campanha precisa parar em vez de gerar milhares de falhas.
- **O gateway não tem endpoint para esvaziar a fila de uma campanha.** O que já foi
  aceito por ele **vai sair** quando a instância for liberada, a menos que a instância
  seja removida. Portanto "interromper" no CRM significa **parar de entregar novas
  mensagens ao gateway**, e a interface não pode prometer que nada mais sai.
  Consequência para o desenho: entregar ao gateway em lotes pequenos, não tudo de uma
  vez, senão a interrupção não interrompe nada.
- A liberação do freio é manual, por script na VPS, e não pelo CRM — a retomada da
  campanha é independente disso, mas só faz sentido depois.

## Arquivos

- **Criar:** migration em `supabase/migrations/` — estado de campanha interrompida, que
  hoje não existe (`status` aceita `rascunho`, `agendada`, `enviando`, `enviada`,
  `cancelada`), e o registro do motivo da interrupção.
- **Modificar:** `src/lib/campanhas.ts` — `processarCampanhasPendentes` seleciona
  campanhas por `status = "enviando"` (linha 161) e precisa passar a respeitar o estado
  novo; o laço de envio precisa poder parar no meio do lote.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — as ações de interromper e
  retomar, com autorização no backend (campanhas são de Admin e Gerente, conforme as
  policies da migration de campanhas).
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` e
  `[id]/relatorio/relatorio-client.tsx` — os botões e o motivo da interrupção.
- **Modificar:** o tratamento de `instance.braked` da B6-04 — passa a interromper as
  campanhas em andamento daquele número.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B6-04 — o evento de freio precisa estar chegando.
- B7-03 — a campanha precisa saber qual número usa, para o freio saber qual campanha
  interromper.
- B8-02 — o acompanhamento é onde a interrupção aparece.

## Critérios de aceite

- [ ] Interromper uma campanha em andamento faz o CRM parar de entregar novas mensagens
      ao canal, e o que já saiu permanece registrado.
- [ ] A interface não promete que mensagens já aceitas pelo gateway serão canceladas.
- [ ] Retomar continua de onde parou, e ninguém que já recebeu recebe de novo.
- [ ] Freio no número interrompe automaticamente as campanhas em andamento dele, e o
      motivo (`banned`, `failure_rate` ou `manual`) fica visível, com a quantidade
      parada.
- [ ] Freio num número não interfere em campanha de outro número.
- [ ] Campanha interrompida não volta a disparar sozinha no processamento periódico.
- [ ] Interromper e retomar exigem Admin ou Gerente, verificado no backend.
- [ ] `npm run build`, `npm run lint` e os testes passam.

## Fora de escopo

- Liberar o freio do número, que é operação do gateway, por script na VPS.
- Cancelamento definitivo, que já existe.
- Reenviar as falhas de uma campanha.
