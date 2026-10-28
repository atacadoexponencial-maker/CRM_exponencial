# B49-01: O chat mostra as mídias por link com prazo

**Tipo:** Implementação
**Página:** Chat
**Spec:** `pre-desenvolvimento/spec-anexos-do-chat-privados.md`

## Descrição

A conversa passa a receber, para cada mídia e miniatura, um link de 1 hora gerado pelo
servidor, só para arquivos da própria empresa. Isso vale ao abrir a conversa, para a
mensagem que chega na hora e para as mensagens antigas.

## Pronto quando

Ao abrir uma conversa, nova ou antiga, foto, áudio, vídeo, figurinha, documento e
miniatura aparecem por um link que vence em 1 hora. Mídia de outra empresa não ganha
link.

## Critérios de aceite

- **CA-B49-03** (automática) — O link da tela vale 1 hora. Dado uma conversa com foto, quando a tela recebe o link da foto, então o link abre agora e o prazo dele é de 1 hora (o vencimento gravado no link é de 3600 segundos).
- **CA-B49-04** (automática) — A conversa mostra todas as mídias. Dado uma conversa com foto, áudio, vídeo, figurinha e documento, enviados e recebidos, e a miniatura do documento, quando o atendente abre a conversa, então cada mídia e a miniatura chegam com um link que abre o arquivo certo.
- **CA-B49-05** (automática) — Mídia que chega na hora aparece sem recarregar. Dado a conversa aberta, quando chega uma mensagem com foto, recebida do cliente ou enviada pelo celular, então a foto aparece com um link que abre, sem recarregar a tela.
- **CA-B49-06** (automática) — Conversas antigas continuam com as mídias. Dado uma mensagem gravada antes da mudança, com o endereço público antigo, quando o atendente abre a conversa, então a mídia dela aparece com um link que abre.
- **CA-B49-07** (automática) — Só arquivo da própria empresa ganha link. Dado uma mensagem da empresa A cujo conteúdo aponta para um arquivo da empresa B, quando o atendente da empresa A abre a conversa, então essa mídia não ganha link (não abre), e as outras mídias da conversa abrem normalmente.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B49-02 | Mensagens já gravadas com o endereço público não precisam ser regravadas: o CRM tira do endereço antigo o caminho do arquivo e gera o link novo (não há clientes reais ainda) | confirmada | Marcelle aprovou a spec em 28/10/2026 com esta suposição exposta; vale a regra dela de não tratar dado antigo enquanto não há clientes reais. O CA-B49-06 prova que as mensagens antigas abrem |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B49-01 | Por quanto tempo o link de um anexo copiado para fora do CRM continua abrindo? | respondida | 1 hora, igual à foto de perfil (Marcelle, 28/10/2026) |

## Cenários

### Happy Path
1. O atendente abre uma conversa. `buscarMensagens` lê as mensagens, como hoje, com o cliente da sessão (RLS).
2. Para cada mensagem com arquivo (imagem, áudio, vídeo, documento, figurinha), o servidor tira do conteúdo gravado (o endereço público de sempre) o caminho no bucket `chat-attachments`, e faz o mesmo com a miniatura.
3. Os caminhos que começam com a pasta da empresa ganham, numa ida só, um link assinado de 1 hora (`createSignedUrls`, chave de serviço), que substitui o conteúdo e a miniatura na resposta.
4. Mensagem nova (recebida do cliente ou enviada pelo celular): `transmitirMensagem` faz a mesma troca antes de transmitir, e a tela mostra a mídia sem recarregar.

### Edge Cases
- Mensagem de texto, nota interna ou conteúdo que não é endereço do bucket: passa sem mudança.
- Mensagem sem miniatura: continua sem.
- Caminho de outra empresa (no conteúdo ou na miniatura): não é assinado; o conteúdo vai vazio e a miniatura some. As outras mídias da conversa seguem normais.
- Arquivo apagado do bucket: o Storage não devolve link para ele; o conteúdo vai vazio, como hoje fica um link quebrado.

### Cenário de Erro
- Falha ao assinar (rede): `buscarMensagens` devolve as mensagens com o conteúdo vazio nas mídias, em vez de derrubar a conversa inteira.
- Em `transmitirMensagem`, falha ao assinar não derruba quem chamou, como já é a regra do arquivo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B49-03 | automática | `src/test/anexos-do-chat.integration.test.ts` | o link da foto devolvido por `buscarMensagens` baixa a foto e o token dele vence 3600 s depois de emitido |
| CA-B49-04 | automática | `src/test/anexos-do-chat.integration.test.ts` | foto, áudio, vídeo, figurinha, documento (enviados e recebidos) e a miniatura voltam com link assinado que baixa exatamente o arquivo gravado |
| CA-B49-05 | automática | `src/test/anexos-do-chat.integration.test.ts` | o corpo que `transmitirMensagem` manda ao Realtime traz conteúdo e miniatura com link assinado que baixa o arquivo |
| CA-B49-06 | automática | `src/test/anexos-do-chat.integration.test.ts` | mensagem gravada com o endereço público antigo volta com link assinado (não o endereço antigo) que baixa o arquivo |
| CA-B49-07 | automática | `src/test/anexos-do-chat.integration.test.ts` | com o arquivo da empresa B conferido no bucket antes, a mensagem da empresa A que aponta para ele volta com conteúdo vazio, e as outras mídias da conversa abrem |

## Banco de Dados

Nada muda no banco. O conteúdo gravado das mensagens continua o mesmo.

## Arquivos

- **Criar:** `src/lib/anexos-do-chat.ts` — bucket, prazo de 1 hora, caminho a partir do endereço gravado e troca do conteúdo e da miniatura pelo link assinado, só da própria empresa
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `buscarMensagens` lê `workspace_id` e devolve as mídias com o link assinado
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `transmitirMensagem` transmite a mídia com o link assinado
- **Criar:** `src/test/anexos-do-chat.integration.test.ts` — testes da B49-01, no banco de teste

## Checklist

- [x] `src/lib/anexos-do-chat.ts` com `caminhoDoAnexo` e `comLinksDosAnexos` (prazo 3600 s, só caminhos da própria empresa, outra empresa sai vazia)
- [x] `buscarMensagens` usa `comLinksDosAnexos`
- [x] `transmitirMensagem` usa `comLinksDosAnexos`
- [x] Testes da tabela Prova passando no banco de teste
- [x] Testes que renderizam o chat ou mockam realtime/actions rodados (L-05) e tsc sem erro (L-07)
