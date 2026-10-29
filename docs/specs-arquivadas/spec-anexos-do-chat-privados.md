# Spec: Anexos do chat só para quem é da empresa

> série: B49
> estado: aprovada em 28/10/2026

## Visão Geral

Hoje toda foto, áudio, vídeo, figurinha e documento do chat, e todo anexo de campanha e
de automação, fica guardado num lugar aberto. O link desse arquivo abre para qualquer
pessoa, sem login, para sempre. Quem tiver o link, seja um ex-funcionário, alguém que
recebeu a mensagem encaminhada ou alguém que achou o endereço num histórico, vê a
conversa da empresa com o cliente.

Esta mudança fecha esses arquivos:

- **No CRM:** só um usuário logado da própria empresa abre o arquivo. O link que a tela
  usa vale 1 hora. Copiado para fora, ele para de abrir depois desse prazo.
- **No WhatsApp:** a Meta e o gateway continuam recebendo o arquivo para entregar ao
  cliente. O link deles também é gerado na hora do envio. O da Meta vale 1 hora. O do gateway vale 30 dias, porque ele só baixa o arquivo quando a mensagem sai da fila (PER-B49-03).

Ficou de fora da B47 (rodada 2 da auditoria de segurança Cloudflare). A spec dela está
arquivada em `docs/specs-arquivadas/spec-seguranca-rodada-5.md`.

Para quem usa o CRM, nada muda na tela: as fotos aparecem, os áudios tocam e os
documentos baixam como antes.

## Páginas / Módulos

### Arquivos fechados

**Descrição:** o lugar onde ficam os anexos do chat, das campanhas e das automações
deixa de abrir para quem está de fora.

**Comportamentos:**
- Abrir o endereço antigo de um arquivo, sem login: não abre.
- Usuário logado de outra empresa tenta ler o arquivo: não consegue.
- Link entregue pela tela: abre durante 1 hora e depois não abre mais.

**Critérios de aceite:**

#### CA-B49-01 — O endereço aberto de um anexo não abre mais · prova: automática

- **Dado** um arquivo do chat gravado na empresa A
- **Quando** alguém, sem login, abre o endereço público desse arquivo (o formato de
  link usado até hoje)
- **Então** recebe erro e não recebe o arquivo

#### CA-B49-02 — Usuário de outra empresa não lê o anexo · prova: automática

- **Dado** um arquivo do chat da empresa A, cuja existência foi conferida antes
- **Quando** um usuário logado da empresa B tenta baixar esse arquivo com a própria
  sessão
- **Então** o pedido é recusado

#### CA-B49-03 — O link da tela vale 1 hora · prova: automática

- **Dado** uma conversa com foto
- **Quando** a tela recebe o link da foto
- **Então** o link abre agora e o prazo dele é de 1 hora (o vencimento gravado no link é
  de 3600 segundos)

### Chat

**Descrição:** a conversa continua mostrando tudo o que foi enviado e recebido.

**Comportamentos:**
- Abrir uma conversa com foto, áudio, vídeo, figurinha ou documento, enviados ou
  recebidos.
- Ver a miniatura da primeira página do documento.
- Receber uma mensagem com mídia enquanto a conversa está aberta.
- Abrir uma conversa antiga, com arquivos gravados antes da mudança.
- Baixar um documento.

**Critérios de aceite:**

#### CA-B49-04 — A conversa mostra todas as mídias · prova: automática

- **Dado** uma conversa com foto, áudio, vídeo, figurinha e documento, enviados e
  recebidos, e a miniatura do documento
- **Quando** o atendente abre a conversa
- **Então** cada mídia e a miniatura chegam com um link que abre o arquivo certo

#### CA-B49-05 — Mídia que chega na hora aparece sem recarregar · prova: automática

- **Dado** a conversa aberta
- **Quando** chega uma mensagem com foto, recebida do cliente ou enviada pelo celular
- **Então** a foto aparece com um link que abre, sem recarregar a tela

#### CA-B49-06 — Conversas antigas continuam com as mídias · prova: automática

- **Dado** uma mensagem gravada antes da mudança, com o endereço público antigo
- **Quando** o atendente abre a conversa
- **Então** a mídia dela aparece com um link que abre

#### CA-B49-07 — Só arquivo da própria empresa ganha link · prova: automática

- **Dado** uma mensagem da empresa A cujo conteúdo aponta para um arquivo da empresa B
- **Quando** o atendente da empresa A abre a conversa
- **Então** essa mídia não ganha link (não abre), e as outras mídias da conversa abrem
  normalmente

#### CA-B49-08 — No preview, o chat funciona como antes · prova: manual

- **Dado** o preview do branch, com uma conversa da empresa de teste que tem foto,
  áudio, vídeo, figurinha e documento
- **Quando** a conversa é aberta
- **Então** a foto e a figurinha aparecem, o áudio e o vídeo tocam, e o documento mostra
  a miniatura e baixa

### Envio para o WhatsApp

**Descrição:** o arquivo continua chegando ao cliente pela API Oficial e pelo canal
direto.

**Comportamentos:**
- Mandar foto, áudio, vídeo e documento pelo chat.
- Disparar uma campanha com anexo, inclusive horas depois de criada.
- Rodar uma automação que manda arquivo, inclusive dias depois de configurada.
- Escolher como anexo de campanha só um arquivo da própria empresa (regra da B47).

**Critérios de aceite:**

#### CA-B49-09 — O envio pelo chat entrega um link que abre · prova: automática

- **Dado** o atendente mandando foto, áudio, vídeo ou documento pelo chat
- **Quando** o CRM passa o arquivo para a Meta ou para o gateway
- **Então** o link passado abre sem login (é o que a Meta e o gateway baixam)

#### CA-B49-10 — Campanha manda um link novo na hora de cada envio · prova: automática

- **Dado** uma campanha com anexo, criada mais de 1 hora antes do envio
- **Quando** o envio de um destinatário acontece
- **Então** o link passado abre (é gerado nesse momento, não o da criação)

#### CA-B49-11 — Automação manda um link novo na hora de executar · prova: automática

- **Dado** uma automação com o bloco de enviar arquivo, configurada mais de 1 hora antes
- **Quando** ela executa para um contato
- **Então** o link passado abre (é gerado nesse momento)

#### CA-B49-12 — Anexo de campanha continua preso à empresa · prova: automática

- **Dado** uma campanha cujo anexo aponta para um arquivo de outra empresa, ou de fora
  da pasta de campanhas, no endereço gravado ou num link assinado (o que a tela passou a receber)
- **Quando** ela é salva ou chega a hora do envio
- **Então** salvar é recusado e o envio é interrompido, como na B47

#### CA-B49-13 — O arquivo chega no celular · prova: manual

- **Dado** o número conectado da Marcelle
- **Quando** ela manda pelo CRM uma foto e um documento para o próprio celular, e dispara
  uma campanha de teste com anexo para um contato seu
- **Então** os três chegam no celular e abrem

### Limpeza de arquivos

**Descrição:** o que apaga arquivo continua achando os arquivos.

**Comportamentos:**
- Apagar de vez um contato da lixeira.
- Limpar os arquivos de automação que ninguém usa mais.

**Critérios de aceite:**

#### CA-B49-14 — Apagar da lixeira leva os arquivos junto · prova: automática

- **Dado** um contato na lixeira com mídias recebidas e enviadas, inclusive enviadas depois da mudança
- **Quando** ele é apagado de vez
- **Então** os arquivos das mensagens dele somem do armazenamento, e os de campanha
  ficam

#### CA-B49-15 — A limpeza das automações não apaga arquivo em uso · prova: automática

- **Dado** uma automação que usa um arquivo subido pelo editor depois da mudança, e um arquivo que
  nenhuma automação usa
- **Quando** a limpeza roda
- **Então** só o arquivo sem uso some

## Fora de escopo

- A loja do catálogo e as fotos dos produtos. Elas ficam abertas, porque a loja é
  pública de propósito.
- A foto de perfil do contato. Ela já é fechada desde a B29.
- O gateway recusar baixar arquivo de endereço interno da VPS (outro repositório).
- Telas: a mudança é no servidor. As telas que a B48 do Luan mexe não são tocadas, salvo
  o mínimo para receber o link novo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B49-01 | A Meta e o gateway baixam o arquivo logo depois de receber o pedido de envio, dentro de 1 hora; um link de 1 hora basta para eles | invalidada | O gateway guarda o pedido na fila e só baixa o arquivo quando a mensagem sai (whatsapp-gateway, src/envio/enviador.ts); campanha grande leva dias. Virou a PER-B49-03 (Claude, conferido no código em 29/10/2026) |
| SUP-B49-02 | Mensagens já gravadas com o endereço público não precisam ser regravadas: o CRM tira do endereço antigo o caminho do arquivo e gera o link novo (não há clientes reais ainda) | confirmada | Marcelle aprovou a spec em 28/10/2026 com esta suposição exposta; vale a regra dela de não tratar dado antigo enquanto não há clientes reais. O CA-B49-06 prova que as mensagens antigas abrem |
| SUP-B49-03 | Reenviar uma mensagem de mídia que falhou, se existir, usa o mesmo caminho do envio do chat e ganha link novo na hora | invalidada | O chat não tem reenvio de mensagem com falha; não há o que cobrir (Claude, conferido no código em 28/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B49-01 | Por quanto tempo o link de um anexo copiado para fora do CRM continua abrindo? | respondida | 1 hora, igual à foto de perfil (Marcelle, 28/10/2026) |
| PER-B49-02 | A B49 espera o merge da B48 do Luan, que mexe em 4 dos mesmos arquivos? | respondida | Não: é feita agora, no master; o Luan é avisado dos trechos mudados (Marcelle, 28/10/2026) |
| PER-B49-03 | Quanto vale o link entregue à fila do gateway, que só baixa o arquivo quando a mensagem sai? | respondida | 30 dias, só para o gateway; a tela e a Meta continuam com 1 hora (Marcelle, 29/10/2026) |
