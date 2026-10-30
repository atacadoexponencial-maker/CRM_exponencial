# B53-01: Imagem enviada por automação chega pela API Oficial

**Tipo:** Implementação
**Página:** Automações — enviar arquivo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

A ação "Enviar arquivo" deixa de mandar o nome do arquivo quando é imagem; a Meta recusa esse campo em imagem. Documento continua com nome.

## Pronto quando

Uma automação com imagem no número da API Oficial entrega a imagem no celular.

## Critérios de aceite

- **CA-B53-01** (automática) — Imagem da automação sai sem nome de arquivo. Dado uma automação com a ação "Enviar arquivo" com uma imagem, quando ela roda para um contato num número da API Oficial, então o pedido à Meta leva a imagem sem o nome do arquivo (a Meta recusa `filename` em `image`), e um documento continua levando o nome.
- **CA-B53-02** (manual) — Imagem da automação chega no celular pela API Oficial. Dado a automação do roteiro B5.3 no número +55 11 95504-6911, quando o gatilho dispara, então a imagem chega no celular do contato e o Histórico mostra a execução concluída.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A automação chega à ação "Enviar arquivo" com uma imagem (`arquivo_tipo = "imagem"`).
2. `enviarArquivo` (`src/lib/automacoes/envio.ts`) monta o envio e `enviarWhatsAppComMotivo` (`src/lib/whatsapp-envio.ts`) chama `provider.enviarMidia`.
3. No número da API Oficial, `criarProviderMeta` (`src/lib/whatsapp/provider-meta.ts`) monta `image: { link }`, **sem** `filename`, e a Meta aceita.
4. Com documento, o corpo continua `document: { link, filename }`.

### Edge Cases
- Imagem pelo canal direto (gateway): nada muda; o gateway continua recebendo o nome como hoje.
- Vídeo e áudio pela Meta: também não aceitam `filename`; a chave só entra em `document`.
- Chat e campanha já não mandam nome para imagem; a regra no provider não muda o corpo deles.

### Cenário de Erro
- Se a Meta recusar por outro motivo, a ação falha com "O WhatsApp recusou o envio: …", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-01 | automática | `src/test/automacoes-envio.test.ts` | a ação "Enviar arquivo" com imagem, pelo provider da Meta, faz o POST com `image` sem `filename`; com documento, `document` leva o `filename` |
| CA-B53-02 | manual | roteiro abaixo | a imagem chega no celular e o Histórico mostra "Concluída" |

### Roteiro manual — CA-B53-02
1. Na empresa "[TESTE] Automações B11" (produção), abra a automação do roteiro B5.3 com a ação "Enviar arquivo" com uma imagem, no número +55 11 95504-6911.
2. Dispare o gatilho (mande a mensagem combinada do celular de teste para o número).
3. Confira que a imagem chega no celular do contato.
4. Em `/configuracoes/automacoes/historico`, confira a execução como "Concluída".

## Arquivos

- **Modificar:** `src/lib/whatsapp/provider-meta.ts` — `enviarMidia` só põe `filename` quando o tipo é `document`.
- **Modificar:** `src/test/automacoes-envio.test.ts` — teste do CA-B53-01 com o provider da Meta de verdade e o `fetch` simulado.

## Checklist

- [x] `filename` só entra no corpo da Meta para documento
- [x] Teste do CA-B53-01 (imagem sem `filename`, documento com `filename`)
- [x] Testes do provider (`whatsapp-provider-corpo.test.ts`) continuam passando

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B53-02 | Marcelle | 30/10/2026 |
