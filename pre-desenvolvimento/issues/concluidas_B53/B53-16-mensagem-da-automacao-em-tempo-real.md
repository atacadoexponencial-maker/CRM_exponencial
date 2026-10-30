# B53-16: Mensagem enviada por automação aparece na conversa aberta

**Tipo:** Implementação
**Página:** Chat — mensagens das automações
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O envio das automações passa a avisar a conversa aberta pelo tempo real, com a mesma mensagem gravada, como o chat e o webhook já fazem.

## Pronto quando

A mensagem da automação aparece na conversa aberta sem F5.

## Critérios de aceite

- **CA-B53-32** (automática) — Mensagem da automação vai à conversa aberta. Dado uma automação que envia uma mensagem a um contato, quando a mensagem é gravada na conversa, então a conversa aberta no navegador recebe a mesma mensagem (mesmo id) pelo tempo real, e uma falha no tempo real não desfaz o envio.
- **CA-B53-33** (manual) — Mensagem da automação aparece sem F5. Dado a conversa com o celular de teste aberta no Chat, quando a automação "teste espera" manda "Primeira" e, 1 minuto depois, "Segunda", então as duas aparecem na conversa sem recarregar a página.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A automação envia; `enviarWhatsAppComMotivo` grava a mensagem com o id gerado ali e chama `transmitirMensagem` com ela.
2. A tela aberta recebe `nova_mensagem` no tópico de quem pode ver a conversa e acrescenta a mensagem.

### Casos de borda
- Gravar falhou: nada é transmitido.
- O tempo real falhou: o envio continua ok; a mensagem aparece no próximo carregamento.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-32 | automática | `src/test/automacao-mensagem-em-tempo-real.test.ts` | a mensagem gravada é transmitida com o mesmo id; falha no tempo real não muda o resultado; gravação com erro não transmite |
| CA-B53-33 | manual | roteiro abaixo | as duas mensagens aparecem sem F5 |

### Roteiro manual — CA-B53-33
1. Abra no Chat a conversa do celular de teste com o número da API Oficial.
2. Do celular, mande "teste espera".
3. Sem recarregar, "Primeira" aparece na hora e "Segunda" cerca de 1 minuto depois.

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Modificar:** `src/lib/whatsapp-envio.ts` — o id da mensagem nasce no envio e a mensagem gravada é transmitida com `transmitirMensagem` (`src/lib/whatsapp/realtime.ts`)
- **Criar:** `src/test/automacao-mensagem-em-tempo-real.test.ts` — CA-B53-32
- **Modificar:** `src/test/automacoes-envio.test.ts` — simula o tempo real, que o envio passou a chamar

Reuso: `transmitirMensagem` (tópicos por quem pode ver a conversa, link assinado da mídia), o mesmo do webhook e do gateway.

## Checklist

- [x] Envio das automações transmite a mensagem gravada
- [x] Teste do CA-B53-32

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B53-33 | Marcelle | 30/10/2026 |
