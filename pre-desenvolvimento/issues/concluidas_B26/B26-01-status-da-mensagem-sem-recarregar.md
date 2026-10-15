# B26-01: Status da mensagem recém-enviada atualiza sem recarregar

**Tipo:** Implementação
**Página:** Chat (`/chat`)
**Spec:** `pre-desenvolvimento/spec-mensagem-na-fila.md`

## Descrição

A mensagem que o atendente acaba de enviar aparece na tela com um identificador
provisório, e a atualização de status em tempo real procura pelo identificador real.
Por isso ela fica em ✓ até recarregar. A mensagem enviada passa a assumir o
identificador real, e os avisos de entregue e de lida chegam a ela na hora, nos dois
canais.

## Pronto quando

O atendente envia texto ou arquivo pelo chat e vê ✓ virar ✓✓ e depois ✓✓ azul, sem
recarregar, tanto num número do canal direto quanto num da API Oficial.

## Critérios de aceite

- **CA-B26-05** (automática) — Mensagem recém-enviada atualiza para entregue e lida sem recarregar. Dado uma mensagem que o atendente acabou de enviar, ainda na tela em que enviou, quando chegam os avisos de entregue e de lida, então a mensagem mostra ✓✓ e depois ✓✓ azul, sem recarregar. Vale nos dois canais.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O atendente envia um texto (ou foto, documento, vídeo, áudio) pelo chat.
2. A mensagem aparece na hora com id provisório (`local-…`) e ✓.
3. A ação do servidor envia, grava a mensagem e devolve o id real dela.
4. A tela troca o id provisório pelo real.
5. Chegam os avisos de entregue e lida (atualização em tempo real da tabela `messages`); como o id agora bate, a mensagem passa a ✓✓ e depois ✓✓ azul, sem recarregar.

### Edge Cases
- **Aviso de status chega antes da troca de id** (entregue muito rápido, antes de a ação responder): o aviso de uma mensagem que ainda não está na lista fica guardado por id; quando a troca acontece, o status guardado é aplicado.
- **Mensagem enviada saiu mas não foi gravada** (insert falhou depois do envio): a ação não tem id para devolver; a mensagem continua com o id provisório e ✓, como hoje.
- **Nota interna:** não vai ao WhatsApp, não tem id real nem status; nada muda.
- **Duas mensagens enviadas em sequência rápida:** cada uma tem seu id provisório e é trocada pela sua resposta.
- **Atendente troca de conversa antes de a ação responder:** a troca acontece na lista daquela conversa, que fica guardada no estado do chat.

### Cenário de Erro
- **Envio falhou:** a ação devolve `{ erro }` sem id; a mensagem fica com o triângulo vermelho e o motivo, como hoje.
- **Sem resposta do servidor:** como hoje (`MOTIVO_SEM_RESPOSTA`).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B26-05 | automática | `src/test/chat-status-sem-recarregar.test.ts` | Mensagem enviada com id provisório, depois de confirmada com o id real, recebe entregue e lida (inclusive aviso que chegou antes da confirmação) |
| CA-B26-05 | automática | `src/test/chat-envio-automacoes.test.ts` | As ações de envio do chat (texto e mídia) devolvem o id da mensagem gravada, e nada quando o envio falha |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Criar:** `src/app/(auth)/chat/mensagens-locais.ts` — funções puras sobre a lista de mensagens da conversa: aplicar um status por id (dizendo se achou) e confirmar o envio (trocar id provisório pelo real, aplicando status guardado).
- **Criar:** `src/test/chat-status-sem-recarregar.test.ts` — testes da CA-B26-05.
- **Modificar:** `src/test/chat-envio-automacoes.test.ts` — teste da CA-B26-05 para o retorno do id; o teste da B11-05 que esperava `{}` de `enviarMensagem` passa a esperar `{ mensagemId }` (consequência direta desta issue).
- **Modificar:** `src/app/(auth)/chat/actions.ts` — as cinco funções de envio (`enviarMensagemSemMotivo`, `enviarImagemSemMotivo`, `enviarDocumentoSemMotivo`, `enviarVideoSemMotivo`, `enviarAudioSemMotivo`) devolvem o id da mensagem gravada; `comMotivo` o repassa em `ResultadoDoEnvio.mensagemId`.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — nova prop `onMensagemConfirmada(tempId, mensagemId)`, chamada pelos cinco envios quando a ação devolve o id.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — trata `onMensagemConfirmada` com `confirmarEnvio`; o UPDATE de `messages` usa `aplicarStatus` e guarda (num `useRef`) o status de id que ainda não está na lista.

Reuso: o tipo `Mensagem` de `../mock-conversas`; o padrão de cliente falso de `src/test/chat-envio-automacoes.test.ts` para testar o retorno das ações.

## Checklist

- [x] Criar `mensagens-locais.ts` com `aplicarStatus` e `confirmarEnvio`
- [x] Ações de envio do chat devolvem `mensagemId`
- [x] `PainelConversa` chama `onMensagemConfirmada` nos cinco envios
- [x] `ChatLayout` troca o id e aplica status guardado; UPDATE usa `aplicarStatus` e guarda o que não achou
- [x] Testes da CA-B26-05
