# B4-03: Sinal de risco e alertas do número na central

**Tipo:** Implementação
**Módulo:** B4 — Saúde e Risco do Número
**Repositório:** `CRM_exponencial`

---

## Contexto

Saber o consumo dos tetos (`B4-02`) não basta: o cliente precisa de um sinal que diga
"esse número está indo para o banimento", e precisa ser avisado **sem estar com a tela de
saúde aberta**. Perder o número do cliente é o pior desfecho do canal direto.

A spec pede duas coisas nesta issue: a **classificação** do risco, com a explicação do que
o está elevando, e dois **alertas** na central de alertas que já existe em `/alertas`.

---

## O que construir

1. **O cálculo do sinal de risco**, no backend, a partir dos ingredientes que o gateway
   devolve: proporção de respostas, volume enviado para números sem histórico de conversa,
   ritmo e consumo dos tetos. Classifica em baixo, médio ou alto — e devolve **junto a
   razão**, porque "risco alto" sem motivo não diz ao cliente o que parar de fazer.

2. **Dois alertas novos na central de alertas:**
   - risco de um número fica alto;
   - número é desconectado ou banido.

**Achado de pesquisa que muda o desenho, e precisa de decisão no `/plan`:** hoje a central
de alertas **não guarda alertas**. Ela os *deriva na leitura* a partir de
`pipeline_cards`, comparando `etapa_changed_at` e a última atividade da conversa com os
limiares de `alert_config` (`src/lib/alertas.ts:calcularAlertas`, chamado por
`src/app/(auth)/alertas/actions.ts:listarAlertas`). Os quatro tipos existentes —
`lead_sem_resposta`, `sem_recompra`, `em_risco`, `inativo` — são todos sobre **contato
parado**, e cada alerta é ancorado em um `cardId`.

Um alerta de número não tem card, não tem contato e não tem etapa. Ele não cabe no modelo
atual. As duas saídas:

- **derivar também**, chamando o gateway na abertura da central — simples, sem tabela
  nova, mas faz `/alertas` depender de rede e ficar lenta e quebradiça;
- **persistir**, gravando o alerta quando o evento chega do gateway (`instance.state` com
  `banned`/`disconnected`, `instance.braked`) e a central passando a ler de duas fontes.

Recomendação: **persistir**. Os eventos já chegam pelo webhook de B6, e alerta de número
tem que aparecer mesmo com o gateway momentaneamente fora do ar. Custa uma tabela e mexer
em `listarAlertas` para unir as duas fontes. Decidir no `/plan` e registrar.

O risco alto, por não ser evento do gateway, precisa de quem o perceba: reavaliar na
chegada de evento de status, ou uma verificação periódica. Escolher no `/plan`, e a escolha
mais simples que atenda basta.

---

## Comportamentos da spec cobertos

- [ ] Ver o sinal de risco atual do número e o que o está elevando
- [ ] Receber alerta na central de alertas quando o risco de um número fica alto
- [ ] Receber alerta na central de alertas quando um número é desconectado ou banido

---

## Contrato do gateway

**Decidido em 17/09/2026: o risco é classificado aqui, no CRM.** O gateway devolve os
ingredientes em `GET /v1/instances/{id}/health` (seção 4.5 do `contrato-v1.md`) — enviadas
e recebidas por período, proporção de falhas, consumo dos tetos, aquecimento e tempo
conectada — e o CRM aplica a régua de baixo, médio e alto, combinando com o que só ele tem
(destinatários sem histórico, por exemplo).

Motivo registrado no contrato: a régua é regra de produto e muda sem deploy do gateway.

Os eventos que disparam os alertas **já existem** no contrato v1: `instance.state`
(seção 3.3, com os estados `disconnected` e `banned` e o campo `reason`) e
`instance.braked` (seção 3.4, com `reason`, `queued_count` e `released`). Quem recebe e
valida esses eventos é B6 — esta issue consome o que B6 entrega, não fala HTTP com o
gateway para isso.

---

## Arquivos

- **Criar:** o cálculo do risco como **função pura**, em `src/lib/`, no mesmo espírito de
  `src/lib/alertas.ts` ("Cálculo puro dos alertas automáticos — testável"). Sem Supabase,
  sem rede, testável com uma tabela de casos
- **Modificar:** `src/lib/alertas.ts` — os tipos novos de alerta e seus rótulos
  (`TipoAlerta`, `TIPO_ALERTA_LABEL`)
- **Modificar:** `src/app/(auth)/alertas/actions.ts` — `listarAlertas` passa a unir as
  duas fontes
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — exibir alerta que não tem
  card nem contato sem quebrar
- **Criar:** migration em `supabase/migrations/`, se a decisão for persistir — com RLS por
  workspace, como todas as outras tabelas
- **Modificar:** os componentes de risco da `B4-01`

> Migration criada não é migration aplicada: rodar `npx supabase db push --linked`.

---

## Depende de

- `B4-00` — os ingredientes do risco vêm do endpoint de saúde. **Bloqueante.**
- `B4-02` — o cliente do gateway e a leitura da saúde
- B6 (Recebimento de Eventos do Gateway) — para os alertas de desconexão, banimento e
  freio. **Bloqueante para os dois comportamentos de alerta**; o comportamento do sinal de
  risco não espera por B6

---

## Critérios de aceite

- [ ] O sinal de risco aparece na tela de saúde, com a razão de estar naquele nível
- [ ] O cálculo do risco é função pura, testada com casos de baixo, médio e alto
- [ ] Número que fica com risco alto gera alerta na central de alertas
- [ ] Número desconectado ou banido gera alerta na central de alertas
- [ ] Os quatro tipos de alerta que já existiam continuam funcionando igual
- [ ] Alerta de número aparece na central mesmo com o gateway fora do ar
- [ ] O mesmo alerta não se repete a cada leitura da central
- [ ] Nenhuma regra de classificação de risco em componente React
- [ ] Decisão sobre derivar ou persistir registrada por escrito, com o porquê
- [ ] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Notificar por fora do CRM — e-mail, push ou WhatsApp. A spec pede a central de alertas
- Alerta de risco para números da Meta: a Meta não expõe esses números
- Mexer nos limiares de `alert_config`: os quatro tipos existentes não mudam
- Liberar o freio — é `B4-04`
- Interromper campanha quando o número é freado — é B8
