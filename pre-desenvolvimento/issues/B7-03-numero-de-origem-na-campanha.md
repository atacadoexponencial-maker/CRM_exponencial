# B7-03: Número de origem na campanha

**Tipo:** Implementação
**Módulo:** B7 — Envio pelos Módulos Existentes
**Repositório:** `CRM_exponencial`

## Contexto

Uma campanha hoje não escolhe por onde dispara: `processarCampanha`
(`src/lib/campanhas.ts`) pede o provider do workspace e usa o que vier. Com dois canais,
essa escolha passa a ser a decisão mais importante da campanha — é ela que define o
risco de banimento e a velocidade do disparo.

Esta issue entrega a escolha do número no editor de campanha e o respeito a ela no
disparo. O aviso de risco, a estimativa de duração e o acompanhamento são B8.

## O que construir

1. **Campo de número de origem** na campanha, gravado junto dela.
2. **Seleção no editor**, listando os números conectados do workspace com o canal de
   cada um.
3. **Disparo pelo número escolhido**, em vez do primeiro conectado.

## Comportamentos da spec cobertos

- [ ] Escolher o número de origem ao criar uma campanha

## Contrato do gateway

Não é chamado aqui: o disparo continua passando pela camada de provider. O que importa
do contrato:

- Toda mensagem enviada pelo gateway é **enfileirada** e respeita ritmo, tetos e janela
  de envio do número. A campanha deve identificar-se como disparo em massa, e não como
  conversa, para que o cliente esperando resposta passe na frente — no corpo de
  `/messages` isso é `priority: "campaign"`, e quem traduz é o provider do gateway
  (B1-02), não este arquivo.
- Se a B1-02 não tiver previsto como o chamador declara prioridade, esta issue é o
  momento de acertar isso **no contrato interno** (`src/lib/whatsapp/tipos.ts`), com
  aviso, porque B6 e B8 dependem dele.

## Arquivos

- **Criar:** migration em `supabase/migrations/` — a campanha passa a guardar a conexão
  de origem. Campanhas existentes ficam com a conexão Meta atual do workspace.
  Referência do schema: `supabase/migrations/20260612000001_create_campaigns.sql`.
- **Modificar:** `src/lib/campanhas.ts` — `processarCampanha` passa a resolver o
  provider pela conexão gravada na campanha, em vez do workspace. O tratamento de
  "sem conexão" já existe (marca os pendentes como falhos) e vale igual quando o
  número escolhido não está mais conectado.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` e
  `src/app/(auth)/campanhas/actions.ts` — o editor de 3 etapas ganha a escolha do
  número, com os dados vindos do backend.
- **Consultar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — se a lista precisa
  mostrar o número usado, decidir no plano; não é comportamento pedido pela spec.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B1-02 — o provider do gateway.
- B7-01 — a resolução de provider por conexão, e não por workspace.

## Critérios de aceite

- [ ] O editor lista os números conectados do workspace, com o canal de cada um, e
      permite escolher um.
- [ ] A campanha grava o número escolhido e dispara por ele.
- [ ] Campanha de canal direto identifica-se como disparo em massa, e não como conversa.
- [ ] Campanha antiga, sem número gravado, continua disparando sem erro.
- [ ] Número escolhido desconectado no momento do disparo cai no tratamento que já
      existe, marcando os pendentes como falhos, sem exceção não tratada.
- [ ] Nenhuma regra de escolha de canal vive no componente do editor.
- [ ] `npm run build`, `npm run lint` e os testes passam.

## Fora de escopo

- Aviso de risco, estimativa de duração, progresso, interrupção e retomada — é B8.
- Configurar ritmo do número — é B5.
- Segmentação de destinatários, que já existe e não muda.
