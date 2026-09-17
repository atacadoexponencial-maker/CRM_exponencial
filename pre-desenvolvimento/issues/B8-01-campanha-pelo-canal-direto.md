# B8-01: Campanha pelo canal direto

**Tipo:** Implementação
**Módulo:** B8 — Campanhas pelo Canal Direto
**Repositório:** `CRM_exponencial`

## Contexto

Disparo em massa por canal não oficial é o uso com **maior risco de banimento** de todo
o produto. A B7-03 deixou a campanha escolher o número; esta issue garante que, ao
escolher um número do canal direto, o administrador saiba no que está se metendo e
quanto tempo o disparo vai levar.

A estimativa não é enfeite: com ritmo de 40 segundos entre envios, uma campanha de mil
destinatários leva mais de onze horas. Sem ver isso antes de confirmar, o cliente acha
que a campanha travou.

## O que construir

1. **Aviso de risco** na confirmação da campanha, quando o número escolhido é do canal
   direto.
2. **Estimativa de duração** do disparo, a partir do ritmo configurado do número e da
   quantidade de destinatários.
3. **A escolha do canal direto de fato liberada** na campanha, que é o que as duas
   coisas acima protegem.

## Comportamentos da spec cobertos

- [ ] Escolher um número do canal direto ao criar uma campanha
- [ ] Ver o aviso de risco antes de confirmar a campanha
- [ ] Ver a duração estimada do disparo conforme o ritmo configurado

## Contrato do gateway

- **Não existe envio imediato.** Toda mensagem é enfileirada e respeita intervalo entre
  envios, tetos por hora e por dia, e janela de horário. A resposta do envio traz
  `estimated_send_at`, que é a previsão para **aquela** mensagem.
- Fora da janela de envio **não é erro**: a mensagem é aceita e adiada, com
  `state: "deferred"` na consulta de fila.
- A estimativa da campanha inteira, portanto, **não vem do gateway**: ela é calculada a
  partir do ritmo do número (intervalo, tetos e janela) e da quantidade de
  destinatários. O gateway informa o ritmo vigente por número — o endpoint que o expõe
  é pendência aberta do lado do gateway, registrada lá; confirmar com a Marcelle se ele
  já existe antes de planejar esta issue.
- Aviso registrado pelo próprio gateway: a previsão que ele calcula hoje **ignora teto e
  fechamento da janela**, então a estimativa do CRM não deve ser derivada de somar
  `estimated_send_at`.

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — o aviso de
  risco e a estimativa aparecem na etapa de confirmação.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — cálculo da estimativa **no
  backend**, nunca no componente, e o texto do aviso vindo pronto.
- **Consultar:** `src/lib/campanhas.ts` — `TAMANHO_LOTE` é 40 e o processamento é por
  lote; isso afeta a estimativa junto com o ritmo do número.
- **Consultar:** `src/lib/whatsapp/tipos.ts` e `index.ts` — o canal do número em uso vem
  do provider, não de consulta solta ao banco no componente.
- **Criar:** teste em `src/test/` para o cálculo da estimativa, que é lógica pura e
  merece teste próprio, com banco mockado.

## Depende de

- B7-03 — a campanha precisa ter número de origem antes de avisar sobre ele.
- B5 — o ritmo configurado do número é a entrada do cálculo. Sem B5, a estimativa usa o
  ritmo padrão; decidir no plano se vale entregar assim ou esperar.

## Critérios de aceite

- [ ] Escolher um número do canal direto mostra, antes da confirmação, um aviso que
      explica o risco de banimento em linguagem de negócio.
- [ ] Escolher um número da Meta **não** mostra o aviso de risco.
- [ ] A estimativa de duração aparece antes de confirmar e muda quando o número escolhido
      ou a quantidade de destinatários muda.
- [ ] A estimativa considera intervalo entre envios, teto por hora, teto por dia e
      janela de horário — e não apenas o intervalo.
- [ ] Uma campanha grande fora da janela de envio mostra estimativa coerente, contando o
      tempo parado.
- [ ] O cálculo roda no backend; o componente só exibe.
- [ ] `npm run build`, `npm run lint` e os testes passam.

## Fora de escopo

- Progresso do disparo em andamento, fila, interrupção e retomada — B8-02 e B8-03.
- Relatório de entrega — B8-04.
- Configurar o ritmo do número — é B5.
