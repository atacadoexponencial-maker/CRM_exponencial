# B7-01: Número de origem em todo envio

**Tipo:** Implementação
**Módulo:** B7 — Envio pelos Módulos Existentes
**Repositório:** `CRM_exponencial`

## Contexto

A B1-01 fez todo envio passar por `resolverProvider(supabase, workspaceId)`, que hoje
pega **a primeira conexão conectada do workspace**. Isso bastava enquanto existia um
canal só.

Com dois canais coexistindo **por número**, o mesmo workspace terá um número na Meta e
outro no gateway. Aí "a primeira conexão conectada" passa a ser sorteio: uma conversa
aberta pelo número do gateway poderia ser respondida pelo número da Meta, e o cliente
receberia resposta de outro telefone.

Esta issue conserta isso: cada envio escolhe **o número certo**, e nenhum arquivo de
negócio passa a saber qual canal atendeu.

## O que construir

1. **Vínculo entre conversa e número**: a conversa passa a saber por qual número ela
   acontece. Hoje `conversations` não tem essa coluna
   (`supabase/migrations/20260501000001_create_conversations.sql`).
2. **Resolução por conversa** no chat: o envio usa o número da conversa.
3. **Resolução por contato** nas automações e nas sequências, que não recebem conversa
   e hoje mandam pelo workspace.
4. **Marcar como lida de verdade**: hoje `marcarComoLidas` só zera o contador no banco
   (`src/app/(auth)/chat/actions.ts:553-563`) e **nunca avisa o canal**. O contrato
   oferece essa operação, e o provider já a expõe.

## Comportamentos da spec cobertos

- [ ] Enviar mensagem do Chat pelo número da conversa, qualquer que seja o canal
- [ ] Enviar mídia do Chat por qualquer canal
- [ ] Marcar conversa como lida por qualquer canal
- [ ] Executar ação de automação de envio por qualquer canal
- [ ] Executar passo de sequência por qualquer canal

## Contrato do gateway

Esta issue não fala com o gateway: fala com o contrato interno criado na B1-01
(`src/lib/whatsapp/tipos.ts`) e com o seletor da B1-02. Do contrato do gateway, o que
importa aqui:

- `marcarComoLida` existe nos dois canais (`suporta("marcar_lida")` é `true` em ambos).
- Uma mensagem enviada pelo gateway é **enfileirada**: a resposta é aceitação, não
  entrega. A mensagem já é gravada na conversa no momento do envio, como hoje, e o
  status real chega depois pelo evento tratado na B6-04.

## Arquivos

- **Criar:** migration em `supabase/migrations/` — a conversa passa a guardar por qual
  conexão ela acontece. Conversas antigas precisam de um valor de preenchimento: hoje
  todas são da única conexão Meta do workspace.
- **Modificar:** `src/lib/whatsapp/index.ts` — uma forma de resolver o provider a partir
  da conversa, ao lado da que resolve pelo workspace. A assinatura existente
  `resolverProvider(supabase, workspaceId)` continua valendo para quem só tem o
  workspace; **mudar a assinatura existente exige avisar**, porque B6 e B8 são escritas
  contra ela.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — os cinco pontos de envio
  (`enviarMensagem:8`, `enviarImagem:54`, `enviarDocumento:135`, `enviarVideo:203`,
  `enviarAudio:270`) passam a resolver pela conversa; `marcarComoLidas:553` passa a
  avisar o canal além de zerar o contador.
- **Modificar:** `src/lib/whatsapp-envio.ts` — `enviarTextoWhatsApp` recebe
  `workspaceId` e `contactId` e é o caminho usado por automações e sequências; resolve
  pela conversa aberta do contato quando houver.
- **Consultar:** `src/lib/automacoes.ts:80` e `src/lib/sequencias.ts:198` — os dois
  chamam `enviarTextoWhatsApp`, então **não precisam mudar** se a resolução ficar
  dentro dele. Confirmar no plano; se não precisarem, dizer isso no lugar de mexer.
- **Modificar:** os eventos de mensagem recebida da B6-02 e o webhook da Meta, para
  gravar a conexão na conversa que abrem. Se isso obrigar a tocar
  `src/app/api/webhooks/whatsapp/route.ts`, é a **primeira** alteração autorizada nele
  desde a B1-01 — tratar com cuidado e cobrir com teste.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B1-02 — o provider do gateway e o seletor com dois caminhos.
- B6-02 — para que conversas criadas pelo canal direto nasçam com a conexão certa.

## Critérios de aceite

- [ ] Com um número Meta e um número do gateway conectados no mesmo workspace,
      responder uma conversa usa o número por onde ela chegou, nas duas direções.
- [ ] Texto, imagem, vídeo, áudio e documento do chat respeitam o número da conversa.
- [ ] Abrir a conversa marca como lida no canal, e não só no banco.
- [ ] Ação de automação de envio e passo de sequência saem pelo número correto.
- [ ] Conversas antigas continuam funcionando, sem envio órfão.
- [ ] Nenhum arquivo de negócio menciona `meta`, `gateway`, `wamid` ou endpoint de
      canal: a escolha continua dentro de `src/lib/whatsapp/`.
- [ ] `npm run build`, `npm run lint` e os testes passam.

## Fora de escopo

- Mostrar o canal na interface da conversa e avisar sobre recurso indisponível — é
  B7-02.
- Escolher o número de origem de uma campanha — é B7-03.
- Fazer a Meta marcar como lida mensagens antigas em massa.
