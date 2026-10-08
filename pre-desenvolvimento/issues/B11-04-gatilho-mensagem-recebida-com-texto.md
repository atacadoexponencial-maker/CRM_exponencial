# B11-04: Gatilho "mensagem recebida do cliente" com condição de texto e tipo

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo (só o necessário)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02

## Descrição

Toda mensagem recebida do cliente, pelos dois canais (API Oficial e canal
direto), passa a disparar as regras desse gatilho, depois de a mensagem estar
gravada. Entram as condições de texto (contém, não contém, começa com, é igual
a, contém alguma das palavras; sem distinguir maiúsculas nem acentos) e de tipo
da mensagem (texto, imagem, áudio, vídeo, documento). Reações e edições não
disparam.

Cobre, no "Editor", o gatilho "Mensagem recebida do cliente" e as condições
de texto e tipo; no "Motor", o ponto de disparo nos dois webhooks.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), uma regra "mensagem recebida contendo 'catálogo' → aplicar
etiqueta Interessado" (criada por script ou pelo editor provisório) aplica a
etiqueta quando o cliente escreve "Quero o CATÁLOGO", e não aplica quando
escreve "oi". O webhook responde ao WhatsApp antes de as ações terminarem
(ver B11-09; até lá, aceita-se rodar dentro da requisição).

## Plano (08/10/2026)

### Decisões do plano

O registro vai para a seção 12 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Onde dispara:** no ponto em que cada canal grava a mensagem nova, logo
  depois do `insert` em `messages`, e só se a mensagem foi gravada.
  - **Canal direto:** em `registrarMensagemRecebida`
    (`src/lib/whatsapp/recebimento.ts`). Reação e aviso de mensagem editada ou
    apagada nunca chegam lá, porque `receberMensagem` os desvia antes. Por isso
    não disparam, sem nenhum filtro a mais.
  - **API Oficial:** no laço de mensagens de `src/app/api/webhooks/whatsapp/route.ts`.
    Lá, a reação chega como mensagem do tipo `reaction` e já é gravada hoje. O
    disparo pula esse tipo e o `system`.
  - **Mensagem não gravada não dispara.** Na reentrega de um evento que morreu no
    meio, o `insert` repetido falha e a regra não roda duas vezes.
  - O evento entra na fila depois do de "conversa criada" (quando a conversa
    nasce), então as regras de conversa criada rodam primeiro.
- **O texto que as condições leem** é o que o cliente escreveu: o texto, ou a
  legenda da foto, do vídeo ou do documento. Localização, cartão de contato e
  mídia sem legenda têm texto vazio. Na API Oficial, só o `text.body`, porque
  esse webhook ainda não lê mídia.
- **O tipo** é o do vocabulário do CRM (`texto`, `imagem`, `audio`, `video`,
  `documento`, e também `figurinha`, `localizacao`, `contato`). Na API Oficial,
  o `type` da Meta passa pelo mesmo `TIPO_NO_CRM` do gateway.
  - **Exceção:** no canal direto, mensagem `desconhecido` com texto conta como
    `texto`. O gateway manda tipo fora do mapa quando o cliente responde citando
    outra mensagem ou manda link (comentário em `traduzirConteudo`). Sem isso,
    "tipo é texto" falharia em toda resposta citada.
- **Comparação do texto:** `normalizarTexto` (`src/lib/catalogo/planilha.ts`),
  que já tira maiúsculas, acentos e espaços repetidos. "Contém alguma das
  palavras" separa a lista por vírgula, ignora itens vazios e procura cada um
  como trecho, igual ao "contém". "Preço" acha "preços".
- **A conversa da regra** é a conversa onde a mensagem chegou, como na "conversa
  criada", e não a aberta mais recente do contato. Com dois números, a
  etiqueta vai para a conversa certa.
- **"Testar com um contato"** usa a última mensagem recebida do contato, na
  conversa mais recente: "com os dados de agora", como diz o diálogo. Sem
  mensagem, o texto e o tipo ficam vazios.
- **Histórico:** o evento gravado leva o tipo e um trecho de até 200 caracteres
  do texto. A linha mostra `Mensagem recebida: "Quero o CATÁLOGO"`.
- **Teste no preview:** a mensagem real do chip vai para a produção, e não para
  o preview (o `webhook_url` da instância é o da produção). O roteiro manda ao
  `/api/webhooks/gateway` do preview um `message.received` assinado com o
  `GATEWAY_WEBHOOK_SECRET` que vale só para o branch (configurado em 08/10), com
  o `instance_id` do chip conectado na empresa de teste. A API Oficial é
  conferida só pelos testes automatizados (decisões, seção 6.3).

### Cenários

#### Happy Path

1. O admin monta pelo editor: "Mensagem recebida do cliente → texto contém
   'catálogo' → sim: aplicar etiqueta Interessado".
2. O cliente escreve "Quero o CATÁLOGO". A mensagem é gravada, o webhook
   responde, e logo depois a regra roda pela fila: a etiqueta entra na conversa
   onde a mensagem chegou.
3. O cliente escreve "oi". A regra segue pelo "não" e nada muda.
4. O histórico mostra as duas execuções, com o texto de cada mensagem.

#### Edge Cases

- **Acento e maiúscula:** "catalogo", "CATÁLOGO" e "Catálogo" casam com "catálogo".
- **Foto com legenda "segue o catálogo":** "texto contém catálogo" vale, e
  "tipo é imagem" vale.
- **Foto sem legenda:** "texto contém X" não vale, e "texto não contém X" vale.
- **Resposta citando outra mensagem** (tipo `desconhecido` com texto no canal
  direto): "tipo é texto" vale.
- **Reação e edição:** não disparam.
- **"Contém alguma das palavras" com "preço, , valor":** o item vazio é
  ignorado. Lista só com vírgulas não casa com nada.
- **Contato na lixeira que escreve:** sai da lixeira antes (B13-05), e as
  regras rodam.
- **Regra com "uma vez por contato":** a segunda mensagem do mesmo contato é
  ignorada, com o motivo no histórico.

#### Cenário de Erro

- **Falha ao gravar o evento na fila:** as regras rodam depois da resposta, sem
  a ordem por contato (`dispararAutomacoes`, B11-09). O recebimento nunca falha
  por causa das automações.
- **Mensagem que não foi gravada** (erro no `insert`): não dispara.
- **Erro de banco numa condição:** a regra para ali, com o motivo no histórico,
  como as outras condições.

### Banco

Nada novo. O evento vai em `automation_queue.evento` e em
`automation_runs.evento`, que são `jsonb`.

### Arquivos

- **Modificar no motor:**
  - `src/lib/automacoes/contexto.ts`: o evento `mensagem_recebida`
    (conversa, mensagem, tipo e texto). `conversaDoEvento` usa a conversa do
    evento sempre que ele tem uma.
  - `src/lib/automacoes/verificacoes.ts`: `texto_mensagem` e `tipo_mensagem`,
    com a comparação numa função pura exportada para os testes.
  - `src/lib/automacoes/acoes.ts`: o reabrir usa a conversa do evento quando ele
    tem uma, como o `conversaDoEvento`.
  - `src/lib/automacoes/execucoes.ts`: `eventoGravado` do evento novo.
  - `src/lib/automacoes/simulacao.ts`: o evento da simulação, com a última
    mensagem recebida.
- **Modificar:** `src/lib/fluxo-automacao.ts`. O gatilho e as duas verificações
  entram nas listas de disponíveis.
- **Modificar nos canais:**
  - `src/lib/whatsapp/recebimento.ts`: o disparo depois do `insert`.
  - `src/app/api/webhooks/whatsapp/route.ts`: o disparo depois do `insert`,
    sem reação.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts`,
  a frase do evento no histórico.
- **Reutilizar:** `normalizarTexto` de `src/lib/catalogo/planilha.ts`;
  `TIPO_NO_CRM` de `src/lib/whatsapp/recebimento.ts`; `dispararAutomacoes` de
  `src/lib/automacoes/fila.ts`.
- **Testes:**
  - `src/test/automacoes-verificacoes.test.ts`, `automacoes-execucoes.test.ts`,
    `automacoes-simulacao.test.ts`, `gateway-recebimento.test.ts` e
    `fluxo-automacao.test.ts` (o exemplo de "em breve" passa a usar o que
    continua indisponível), `automacoes-acoes.test.ts` e
    `gateway-midia-recebida.test.ts` (reação e edição não disparam).
  - Criar `src/test/webhook-whatsapp-automacoes.test.ts`, para o disparo na API
    Oficial, com o banco falso.
  - Criar `e2e/preview/roteiro-b11-04.cjs`, com `enviarEventoDoGateway` em
    `e2e/preview/comum.cjs`, e atualizar o `e2e/preview/README.md`.

### Checklist

- [x] Evento `mensagem_recebida` no contexto, e a conversa do evento em `conversaDoEvento` e no reabrir
- [x] Verificações de texto e tipo da mensagem no motor
- [x] Disparo no canal direto, depois do `insert`
- [x] Disparo na API Oficial, depois do `insert`, sem reação
- [x] Histórico e simulação do evento novo
- [x] Gatilho e verificações nas listas de disponíveis
- [x] Testes automatizados e suíte unitária passando; build com código 0
- [ ] Roteiro no preview passando
- [ ] Medição do webhook com regra ativa (fecha a parte que falta da B11-09)
- [ ] Registro de decisões (seção 12)
