# B25-01: Gateway avisa o CRM da mensagem enviada pelo celular

**Tipo:** Implementação
**Página:** Gateway — aviso de mensagem enviada pelo celular
**Repositório:** `whatsapp-gateway` (e `pre-desenvolvimento/referencia/contrato-gateway-v1.md`, nas duas cópias do contrato)
**Spec:** `pre-desenvolvimento/spec-canal-direto-envio-pelo-celular.md`

## Descrição

O gateway deixa de descartar a mensagem que sai do número conectado por outro aparelho
(celular, WhatsApp Web) e entrega ao CRM um evento novo, separado de "mensagem recebida",
com destinatário, tipo, conteúdo, citação e horário. O que o próprio CRM enviou pelo
gateway, e o que vai para grupo, lista de transmissão ou status, continua sem aviso. O
contrato ganha o evento novo nas duas cópias.

## Pronto quando

Com um número conectado, uma mensagem (texto ou arquivo) enviada pelo celular a um
contato gera, na saída de eventos do gateway, o evento novo assinado como os demais. Uma
mensagem enviada pelo CRM e uma enviada num grupo não geram evento nenhum. O contrato
descreve o evento, e o Luan foi avisado antes do merge.

## Critérios de aceite

- **CA-B25-01** (automática) — Mensagem enviada pelo celular gera o aviso para o CRM. Dado um número conectado pelo canal direto, quando sai do número, por outro aparelho, uma mensagem de texto para um contato, então o gateway entrega ao CRM o evento de mensagem enviada pelo celular, com o destinatário, o texto e o horário, assinado como os demais eventos.
- **CA-B25-02** (automática) — O que o CRM enviou não volta como enviado pelo celular. Dado uma mensagem que o CRM mandou pelo gateway, quando o WhatsApp confirma a saída dela pelo número, então o gateway não entrega aviso de mensagem enviada pelo celular para ela.
- **CA-B25-03** (automática) — Grupo, lista de transmissão e status continuam fora. Dado um número conectado pelo canal direto, quando o vendedor envia, pelo celular, numa conversa de grupo, numa lista de transmissão ou num status, então o gateway não entrega aviso nenhum.
- **CA-B25-04** (automática) — Foto, áudio, vídeo e documento enviados pelo celular chegam com o arquivo. Dado um número conectado pelo canal direto, quando o vendedor envia, pelo celular, uma foto com legenda, um áudio, um vídeo ou um documento, então o aviso leva o tipo, a legenda quando houver e o arquivo, do mesmo jeito que a mensagem recebida leva.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B25-03 | O gateway consegue distinguir, por um registro que ele já guarda, toda mensagem que o próprio CRM enviou. O registro dura 30 dias, mais do que o tempo entre o envio e a confirmação do WhatsApp. | confirmada | Marcelle, 15/10/2026. Conferido no /plan (19/10): o par reverso da A4-01 (`chaveDoParReverso`, 30 dias) existe, mas é gravado depois que o envio devolve o id, e o Baileys emite o eco antes. Por isso a prova principal é `emitOwnEvents: false`; o par fica como defesa a mais. |
| SUP-B25-04 | Mensagem enviada pelo celular enquanto o número estava pausado ou o gateway reiniciava entra no CRM pela mesma janela de mensagens atrasadas que já vale para as recebidas. | confirmada | Marcelle, 15/10/2026. Conferido no /plan (19/10): a janela (`motivoDoDescarte` com `append`) é olhada antes do `fromMe` e vale para qualquer mensagem. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B25-04 | Quem avisa o Luan da mudança no contrato do gateway, e quando? | respondida | A Marcelle avisa. Marcelle, 15/10/2026. |

## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_TESTE | CA-B25-01 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado | Marcelle | 19/10/2026 |
| CRITERIO_SEM_TESTE | CA-B25-02 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado | Marcelle | 19/10/2026 |
| CRITERIO_SEM_TESTE | CA-B25-03 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado | Marcelle | 19/10/2026 |
| CRITERIO_SEM_TESTE | CA-B25-04 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado | Marcelle | 19/10/2026 |

Os testes de CA-B25-01 a CA-B25-04 ficam e rodam no repo `whatsapp-gateway` (Vitest de
lá, `npm test`), que o auditor do CRM não enxerga: ele só lê `src/test` deste repo. A
prova desses quatro critérios é o nome do teste com o código e a suíte do gateway verde,
conferidos pelo `/revisildo` e registrados na seção Resultado desta issue.

- **Motivo:** código e testes vivem em outro repositório.
- **Aprovado por:** Marcelle, 19/10/2026.

## Cenários

### Happy Path
1. O vendedor manda pelo celular "Bom dia" a um cliente. O WhatsApp entrega ao gateway a
   cópia da mensagem com `fromMe: true` e o cliente como conversa (`remoteJid`), pelo
   `messages.upsert` (`notify`; `append` quando chegou com o número fora).
2. O filtro deixa passar: não é grupo, broadcast, status nem histórico antigo.
3. O gateway marca o id como processado (o mesmo registro das recebidas), traduz o LID do
   cliente quando vier LID, baixa a mídia quando houver e normaliza a mensagem como faz
   com a recebida.
4. A normalizada vira os dados do evento novo `message.sent_from_phone`: `from` é o
   número conectado, `to` é o cliente, `to_is_lid` marca LID sem tradução.
5. O gateway entrega o envelope ao CRM pelo mesmo entregador (assinatura, reentrega e
   ordem por contato iguais às da `message.received`).

### Edge Cases
- **Enviada pelo CRM:** o socket abre com `emitOwnEvents: false`, então o que o gateway
  envia nunca volta como mensagem nova. Defesa a mais: se o id do WhatsApp tem par
  reverso (`nossoId`, registro de 30 dias da A4-01), não avisa. O par sozinho não basta,
  porque o Baileys emite o eco antes de o envio devolver o id e o par ser gravado.
- **Grupo, lista de transmissão, status:** descartados pelo filtro, antes de olhar o
  `fromMe` (já é assim).
- **Conversa consigo mesmo** (destinatário = número conectado, depois de traduzir LID):
  não avisa. É também onde caem os avisos de protocolo que o celular troca com os outros
  aparelhos.
- **Reação, edição, exclusão e tipo `unknown` vindos do celular:** não avisam (fora de
  escopo; `unknown` do próprio número é aviso de protocolo, não conversa).
- **Mídia que não baixou:** o aviso sai com o tipo e `media: null`, como na recebida.
- **Enviada com o número pausado ou o gateway reiniciando:** entra pela janela das
  atrasadas (A10-02), igual à recebida.
- **Mesma mensagem duas vezes do Baileys:** o registro de processadas barra a segunda.
- **Não conta** como recebida nos indicadores (A8-02) e não guarda chave de recibo de
  leitura (A4-04).

### Cenário de Erro
- Falha ao traduzir LID: sai com o LID e `to_is_lid: true` (nunca segura nem descarta).
- Falha ao consultar o par reverso no Redis: registra o erro e não avisa. Na dúvida, é
  melhor faltar uma mensagem do celular do que duplicar uma do CRM.
- CRM fora do ar: a reentrega da A7-03 cuida, como nos demais eventos.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B25-01 | automática | `whatsapp-gateway/src/messages/enviada-pelo-celular.test.ts` e `whatsapp-gateway/src/eventos/entregador.test.ts` | Texto do próprio número a um contato vira `message.sent_from_phone` com `to` = contato, `from` = número conectado, texto e horário; o envelope desse tipo sai com `X-Gateway-Signature-256` |
| CA-B25-02 | automática | `whatsapp-gateway/src/messages/enviada-pelo-celular.test.ts` e `whatsapp-gateway/src/whatsapp/fabrica-baileys.test.ts` | Mensagem com par reverso (saiu pelo CRM) não gera aviso; o socket abre com `emitOwnEvents: false` |
| CA-B25-03 | automática | `whatsapp-gateway/src/messages/filtros.test.ts` | Do próprio número, para grupo, lista de transmissão e `status@broadcast`, o filtro descarta; para pessoa, deixa passar |
| CA-B25-04 | automática | `whatsapp-gateway/src/messages/enviada-pelo-celular.test.ts` | Foto com legenda, áudio, vídeo e documento do celular saem com o tipo, a legenda e o objeto `media` (com `filename` no documento) |

## Arquivos

Repo `whatsapp-gateway` (branch `feat/B25-01-aviso-de-envio-pelo-celular`):

- **Criar:** `src/messages/enviada-pelo-celular.ts` — decide se a mensagem do próprio
  número vira aviso (`motivoParaNaoAvisar`: par reverso, conversa consigo mesmo, reação,
  edição/exclusão, `unknown`) e converte a normalizada nos dados do evento
  (`paraEnviadaPeloCelular`), reaproveitando `normalizar` do `normalizador.ts`.
- **Criar:** `src/messages/enviada-pelo-celular.test.ts` — CA-B25-01, 02 e 04.
- **Modificar:** `src/messages/filtros.ts` — `fromMe` deixa de ser motivo de descarte
  (sai o `"propria"`).
- **Modificar:** `src/messages/filtros.test.ts` — o teste de "descarta do próprio
  número" vira o de CA-B25-03.
- **Modificar:** `src/messages/tipos.ts` — tipo `MensagemEnviadaPeloCelular`.
- **Modificar:** `src/eventos/tipos.ts` — `message.sent_from_phone` em
  `TIPOS_DE_EVENTO` e em `DadosDoEvento`.
- **Modificar:** `src/eventos/conversa.ts` — ordem por contato (`to`) para o tipo novo,
  na mesma fila da `message.received` daquele contato.
- **Modificar:** `src/eventos/entregador.test.ts` — envelope do tipo novo assinado
  (CA-B25-01).
- **Modificar:** `src/whatsapp/fabrica-baileys.ts` — opções do socket extraídas para
  `opcoesDoSocket()`, com `emitOwnEvents: false`.
- **Modificar:** `src/whatsapp/fabrica-baileys.test.ts` — CA-B25-02 (opção desligada).
- **Modificar:** `src/index.ts` — `aoMensagem` separa recebida de enviada pelo celular:
  a enviada não conta nos indicadores nem guarda recibo, consulta o par reverso e
  entrega `message.sent_from_phone`.
- **Modificar:** `pre-desenvolvimento/contrato-v1.md` — seção 3.5 com o evento novo,
  linha do histórico de acréscimos, "um dos cinco" no envelope e a frase de "Não geram
  evento" corrigida.

Repo `crm-exponencial`:

- **Modificar:** `pre-desenvolvimento/referencia/contrato-gateway-v1.md` — cópia
  atualizada a partir do contrato do gateway.

## Implantação

O webhook do CRM grava o `event_id` antes de olhar o tipo e responde 200 "tipo
desconhecido" para tipo que não conhece. Publicado antes da B25-02, o gateway mandaria
avisos que o CRM marcaria como processados e jogaria fora, sem reentrega. **Fazer o
merge na `master` do gateway e publicar na VPS só depois da B25-02 no ar.**

## Checklist

- [x] Branch `feat/B25-01-aviso-de-envio-pelo-celular` no gateway
- [x] `filtros.ts` sem descarte por `fromMe`
- [x] Tipo do evento e dos dados (`tipos.ts` de eventos e de mensagens) e ordem em `conversa.ts`
- [x] `enviada-pelo-celular.ts` (decisão e conversão)
- [x] `opcoesDoSocket()` com `emitOwnEvents: false`
- [x] `aoMensagem` no `index.ts` com o caminho da enviada pelo celular
- [x] Contrato: seção 3.5, histórico, envelope e "Não geram evento"
- [x] Cópia do contrato no CRM
- [x] `npm test` e `npm run build` verdes no gateway

## Resultado (prova no repo do gateway)

19/10/2026, branch `feat/B25-01-aviso-de-envio-pelo-celular` do `whatsapp-gateway`:

- `npx vitest run` dos arquivos da tabela Prova: 5 arquivos, 53 testes, todos verdes.
  Testes com o código: CA-B25-01 (`enviada-pelo-celular.test.ts` ×2,
  `entregador.test.ts`), CA-B25-02 (`enviada-pelo-celular.test.ts`,
  `fabrica-baileys.test.ts`), CA-B25-03 (`filtros.test.ts`), CA-B25-04
  (`enviada-pelo-celular.test.ts`).
- `npm run build` verde. `npm test` completo: 923 de 924; o que falhou
  (`midia/rotas.test.ts`, 8,8 s, latência do túnel) passou rodado sozinho (11 de 11).
