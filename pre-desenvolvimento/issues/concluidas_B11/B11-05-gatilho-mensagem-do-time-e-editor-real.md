# B11-05: Gatilho "mensagem enviada pelo time" e editor de fluxo ligado ao banco

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02, B11-04, B11-10

> **Mudança de 07/10/2026:** o editor e a lista gravando no banco saíram desta
> issue e foram para a B11-10, feita logo depois da B11-02, para o Luan testar
> automações no preview mais cedo. O título do arquivo ficou como era, para não
> quebrar as referências.

## Descrição

Mensagem escrita por uma pessoa no chat (texto ou mídia) dispara as regras
desse gatilho, com as mesmas condições de texto e tipo da B11-04. Mensagens
mandadas por automação, sequência ou campanha nunca disparam. O gatilho
"Mensagem enviada pelo time" entra em `GATILHOS_DISPONIVEIS`
(`src/lib/fluxo-automacao.ts`) e deixa de aparecer como "em breve" no editor.

Cobre, no "Editor", o gatilho "Mensagem enviada pelo time"; no "Motor", o
disparo no envio do chat e a regra "automação não dispara automação".

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), o admin cria pelo editor a regra "mensagem enviada pelo time
contendo 'segue o catálogo' → mover card para Catálogo Enviado, adicionar tag
catalogo-enviado"; ao responder isso no chat, o card move e a tag entra. Uma
sequência que manda o mesmo texto não dispara a regra.

## Plano (08/10/2026)

### Decisões do plano

O registro vai para a seção 13 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Onde dispara:** nas cinco funções de envio do chat
  (`src/app/(auth)/chat/actions.ts`): texto, imagem, documento, vídeo e áudio.
  Dispara depois que o WhatsApp aceitou a mensagem e ela foi gravada na
  conversa. Tentativa que falhou não dispara, porque a mensagem não saiu. A
  mensagem rápida escolhida no chat sai pelo envio de texto, então também
  dispara: quem mandou foi uma pessoa.
- **Automação, sequência e campanha nunca disparam, por construção.** Elas
  enviam por outros caminhos (`enviarTextoWhatsApp`/`enviarTextoWhatsAppComMotivo`,
  em `src/lib/whatsapp-envio.ts`, e `src/lib/campanhas.ts`), que não chamam o
  motor. É a mesma regra da seção 9.1: só as telas do CRM disparam.
  - **Descartado:** marcar na mensagem quem enviou e filtrar no motor. Exigiria
    uma coluna nova em `messages` e lembrar de preencher em todo envio. O
    disparo no lugar certo não depende de ninguém lembrar.
- **O evento** tem os mesmos campos da mensagem recebida: conversa, mensagem,
  tipo e texto. As condições de texto e tipo da B11-04 valem para os dois
  gatilhos. O chat não manda legenda com a mídia, então imagem, documento,
  vídeo e áudio têm texto vazio.
- **A chamada passa por `gatilhos-do-crm.ts`** (`dispararMensagemEnviadaPeloTime`),
  como a etiqueta aplicada pelo chat (B11-06). O comentário de lá explica por
  que só o chat a chama.
- **"Testar com um contato"** usa a última mensagem enviada na conversa mais
  recente, sem as que falharam. O CRM não grava quem enviou, então essa
  mensagem pode ser de uma automação. Para uma simulação, serve.
- **Teste no preview:** o envio pelo chat sai de verdade, então precisa do chip
  conectado na empresa de teste e de um número real para receber. O roteiro só
  roda com os dois configurados e para antes de enviar se faltar algum. Antes de
  rodar, o Claude combina com o Luan. "Uma sequência que manda o mesmo texto"
  é conferida com uma automação que manda o texto, porque as duas usam o mesmo
  envio (`enviarTextoWhatsApp`) e a sequência só roda no cron diário. Um teste
  automatizado confere que esse envio não chama o motor.

### Cenários

#### Happy Path

1. O admin monta pelo editor: "Mensagem enviada pelo time → texto contém
   'segue o catálogo' → mover card para Catálogo Enviado e adicionar a tag
   `catalogo-enviado`".
2. O atendente responde no chat "Segue o catálogo 👇". A mensagem sai, é gravada,
   e a resposta volta para a tela.
3. Logo depois, a regra roda pela fila: o card vai para Catálogo Enviado e a tag
   entra.

#### Edge Cases

- **Automação que envia "segue o catálogo":** a regra do time não roda.
- **Sequência ou campanha que envia o mesmo texto:** também não roda.
- **Envio que falhou** (número desconectado): fica na conversa como falha,
  como hoje, e não dispara.
- **Mídia pelo chat:** dispara com o tipo (imagem, documento, vídeo, áudio) e o
  texto vazio. "Tipo é documento" vale; "texto contém" não.
- **Mensagem rápida escolhida no chat:** dispara, com o texto dela.

#### Cenário de Erro

- **Falha ao gravar o evento na fila:** as regras rodam depois da resposta, sem
  a ordem por contato, como nos outros gatilhos. O envio já aconteceu e não é
  afetado.
- **A automação falhar:** o atendente não fica sabendo pelo chat. A falha fica
  no histórico.

### Banco

Nada novo.

### Arquivos

- **Modificar no motor:**
  - `src/lib/automacoes/contexto.ts`: o evento `mensagem_enviada_time`, com os
    mesmos campos da mensagem recebida.
  - `src/lib/automacoes/verificacoes.ts`: texto e tipo valem nos dois gatilhos
    de mensagem.
  - `src/lib/automacoes/execucoes.ts`: `eventoGravado` do evento novo.
  - `src/lib/automacoes/simulacao.ts`: a última mensagem enviada.
  - `src/lib/automacoes/gatilhos-do-crm.ts`: `dispararMensagemEnviadaPeloTime`.
- **Modificar:** `src/lib/fluxo-automacao.ts`. O gatilho entra em
  `GATILHOS_DISPONIVEIS`.
- **Modificar:** `src/app/(auth)/chat/actions.ts`. As cinco funções de envio
  disparam depois de gravar. O id da mensagem gravada vem do `insert`, e o
  contato vem da conversa.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts`,
  a frase do evento no histórico.
- **Reutilizar:** `dispararAutomacoes` (`src/lib/automacoes/fila.ts`), através de
  `gatilhos-do-crm.ts`.
- **Testes:**
  - Criar `src/test/chat-envio-automacoes.test.ts`, com o envio do chat
    simulado: texto e mídia disparam depois de gravar; envio que falhou não
    dispara; o envio das automações e sequências (`enviarTextoWhatsAppComMotivo`)
    não chama o motor.
  - `src/test/automacoes-verificacoes.test.ts`, `automacoes-execucoes.test.ts`,
    `automacoes-simulacao.test.ts`, `automacoes-gatilhos-do-crm.test.ts` e
    `fluxo-automacao.test.ts` (o "em breve" fica só com as ações da B11-07).
  - Criar `e2e/preview/roteiro-b11-05.cjs` e atualizar o
    `e2e/preview/README.md`.
- **Documentação:** a seção 13 de `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`.

### Checklist

- [x] Evento `mensagem_enviada_time` no contexto; texto e tipo valem nos dois gatilhos de mensagem
- [x] `dispararMensagemEnviadaPeloTime` em `gatilhos-do-crm.ts`
- [x] As cinco funções de envio do chat disparam depois de gravar, e só quando a mensagem saiu
- [x] Histórico e simulação do evento novo
- [x] Gatilho na lista de disponíveis
- [x] Testes automatizados e suíte unitária passando; build com código 0
- [x] Roteiro no preview passando (com o chip e um número real, combinado com o Luan)
- [x] Registro de decisões (seção 13)

## Execução (08/10/2026)

**Concluída.** O "Pronto quando" passou no preview com envio de verdade: o
número pessoal do Luan conectado como chip da empresa de teste, mandando para o
número de trabalho dele.

**O que ficou diferente do plano:**

- **O roteiro usa uma automação no lugar da sequência** para mandar a mesma
  frase. As duas enviam por `enviarTextoWhatsAppComMotivo`, que nunca chama o
  motor. O teste automatizado cobre esse caminho, e uma automação é mais rápida
  de montar e de disparar no preview do que uma sequência, que depende da rotina
  diária.

**Como foi verificado:**

- 12 testes novos nesta issue, 5 deles em `chat-envio-automacoes.test.ts`: texto
  e mídia disparam depois de gravar, envio que falhou não dispara, e o envio
  das automações e sequências não chama o motor. A suíte unitária, já com a
  B11-07, tem 49 arquivos e 615 testes passando. Lint com 0 erros e build com
  código de saída 0.
- **No preview** (commit `3c7c8ca`), `e2e/preview/roteiro-b11-05.cjs` passou em
  **9 de 9**, com as 2 regras montadas pela tela:
  - "Segue o catálogo 👇", escrita no chat, saiu pelo chip, moveu o card para
    Catálogo Enviado e pôs a tag `catalogo-enviado`;
  - "Segue o catálogo (automação)", mandada por uma regra, não disparou a regra
    do time, e o card ficou em Lead;
  - o histórico guarda o texto, e a página mostra `Mensagem do time: "Segue o
    catálogo 👇"`.
- As duas mensagens chegaram ao celular de trabalho e foram lidas (conferido
  pelo Luan nos dois celulares).
