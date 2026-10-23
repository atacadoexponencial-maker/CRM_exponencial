uais # B29-01: Gateway responde a foto de perfil de um número

**Tipo:** Implementação
**Página:** Gateway (rota da instância, ao lado de "este número existe?")
**Repositório:** `whatsapp-gateway`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

O gateway ganha uma consulta: dado um telefone, uma instância conectada devolve a foto de
perfil dele (tamanho pequeno), entregando a própria imagem e não o endereço temporário do
WhatsApp. Sem foto visível responde "sem foto", sem erro. A consulta não conta como envio.

## Pronto quando

Com uma instância conectada, uma chamada com a credencial dela para um telefone com foto
visível devolve a imagem; para um telefone sem foto devolve "sem foto"; sem credencial ou
com a instância desconectada é recusada; e nada disso mexe no freio nem no ritmo. Publicado
na VPS.

## Critérios de aceite

- **CA-B29-01** (automática) — O gateway entrega a foto de um número. Dado uma instância conectada e um telefone cujo WhatsApp devolve o endereço de uma foto, quando o CRM pede a foto desse telefone, então o gateway responde com a própria imagem (tipo de conteúdo de imagem) e não com o endereço temporário do WhatsApp.
- **CA-B29-02** (automática) — Número sem foto visível responde "sem foto". Dado uma instância conectada e um telefone cujo WhatsApp não devolve foto (escondida ou inexistente), quando o CRM pede a foto desse telefone, então o gateway responde "sem foto" (resposta vazia com código próprio), sem erro, e não grava nada.
- **CA-B29-03** (automática) — Sem credencial ou instância desconectada, a consulta é recusada. Dado um pedido de foto sem a credencial da instância, ou para uma instância que não está conectada, quando o pedido chega, então o gateway recusa (como recusa as demais rotas da instância) e não consulta o WhatsApp.
- **CA-B29-04** (automática) — A consulta não passa pelo freio nem pelo ritmo. Dado uma instância conectada com o freio acionado ou o ritmo esgotado, quando o CRM pede a foto de um telefone, então a resposta vem normalmente, e nenhum envio é contado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B29-02 | O tamanho guardado é o pequeno (a "prévia" do WhatsApp, cerca de 100 px), suficiente para os círculos do chat e do perfil, e barato de guardar | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.

## Cenários

### Happy Path
1. O CRM chama `GET /v1/instances/:id/contacts/:phone/photo` com o token da instância.
2. A rota limpa o telefone (`destinoValido`, como em `/contacts/:phone`) e exige a
   instância conectada **sem** respeitar o freio (`exigirInstancia(id, false)`): é consulta,
   não envio, e não passa pela fila, então o ritmo também não se aplica.
3. A sessão do Baileys pergunta o endereço da foto pequena (`socket.profilePictureUrl(jid, "preview")`).
4. O gateway baixa a imagem desse endereço com tempo limite (10 s, o mesmo da conferência
   de mídia) e responde `200` com os bytes, `Content-Type` da imagem, `Cache-Control: private, no-store`.

### Edge Cases
- **Sem foto visível** (privacidade ou sem foto): o Baileys devolve `undefined` ou lança
  erro `item-not-found`/`not-authorized` (código 401/404). A rota responde `204`, sem corpo.
- **Telefone inválido**: `400 invalid_payload`, como na rota vizinha.
- **Freio acionado**: responde normalmente; `fila.enfileirar` nunca é chamado.
- **Endereço vence entre a consulta e o download**: o download falha → `500 internal_error`, como nas rotas vizinhas
  (o CRM trata como falha técnica e tenta de novo na próxima mensagem, B29-02).

### Cenário de Erro
- Sem credencial: `401`. Instância desconectada: `409 instance_not_connected`. Banida: `409 instance_banned`.
- Sessão morreu entre a conferência e a consulta: `500 internal_error`, como em `/contacts/:phone`.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B29-01 | automática | `src/envio/rotas.test.ts` (gateway) | com foto, a resposta é `200`, o corpo são os bytes da imagem e o `Content-Type` é de imagem; o endereço do WhatsApp não aparece na resposta |
| CA-B29-02 | automática | `src/envio/rotas.test.ts` (gateway) | sem foto, a resposta é `204` sem corpo, e nada é gravado (nenhum enfileiramento, nenhuma escrita) |
| CA-B29-03 | automática | `src/envio/rotas.test.ts` (gateway) | sem credencial `401`; desconectada `409`; em ambos a sessão não é consultada |
| CA-B29-04 | automática | `src/envio/rotas.test.ts` (gateway) | com freio acionado a resposta vem `200` e a fila não é tocada |

Além da rota, `src/envio/foto-de-perfil.test.ts` prova o download (endereço → bytes, tempo
esgotado → erro, sem endereço → nulo).

## Arquivos

Todos no repositório `whatsapp-gateway`:

- **Modificar:** `src/whatsapp/sessao-tipos.ts` — `urlDaFotoDePerfil(numero): Promise<string | null>` ao lado de `existeNoWhatsApp`.
- **Modificar:** `src/whatsapp/fabrica-baileys.ts` — implementa com `socket.profilePictureUrl`, tratando "sem foto" como nulo.
- **Modificar:** `src/whatsapp/gerenciador.ts` — `urlDaFotoDePerfil(instanceId, numero)`, espelho de `existeNoWhatsApp`.
- **Criar:** `src/envio/foto-de-perfil.ts` — `buscarFotoDePerfil`: pede o endereço à sessão e baixa a imagem com tempo limite (reusa `requisitar` de `src/midia/envio.ts`).
- **Modificar:** `src/midia/envio.ts` — exporta `requisitar` (já existe, privada).
- **Modificar:** `src/envio/rotas.ts` — `fotoDePerfil` em `SinaisDaConversa` e a rota `GET /v1/instances/:id/contacts/:phone/photo`.
- **Modificar:** `src/server.ts` — liga `fotoDePerfil` ao gerenciador.
- **Modificar:** `src/envio/rotas.test.ts` — os quatro critérios.
- **Criar:** `src/envio/foto-de-perfil.test.ts` — o download.
- **Modificar:** `pre-desenvolvimento/contrato-v1.md` (gateway) — linha da rota na tabela 4.3.

## Dependências Externas

- `@whiskeysockets/baileys` 7.0.0-rc14, já instalado: `profilePictureUrl(jid, "preview")` (`lib/Socket/chats.d.ts`).

## Checklist

- [x] Sessão e gerenciador expõem o endereço da foto
- [x] `buscarFotoDePerfil` baixa a imagem com tempo limite
- [x] Rota `/contacts/:phone/photo` com 200/204/400/401/409 e fora do freio
- [x] Contrato atualizado
- [x] Testes dos quatro critérios e do download passando; `npm test`, `npm run build`
- [x] Publicado na VPS (rotina: fetch, md5, tag da imagem, build, update, health) — 23/10/2026, imagem anterior guardada como `wagw:antes-20261023`

## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_TESTE | CA-B29-01 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B25-01) | Marcelle | 20/10/2026 |
| CRITERIO_SEM_TESTE | CA-B29-02 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B25-01) | Marcelle | 20/10/2026 |
| CRITERIO_SEM_TESTE | CA-B29-03 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B25-01) | Marcelle | 20/10/2026 |
| CRITERIO_SEM_TESTE | CA-B29-04 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B25-01) | Marcelle | 20/10/2026 |

As quatro exceções acima foram confirmadas pela Marcelle em 23/10/2026, depois de ver os testes rodarem (8 passando).

## Resultado

Implementada em 20/10/2026 no `whatsapp-gateway`, commit `ecbdebc`. Testes com o código
do critério no nome em `src/envio/rotas.test.ts` (CA-B29-01 a 04) e o download em
`src/envio/foto-de-perfil.test.ts`. Suíte do gateway: 62 arquivos, 940 testes passando;
`npm run build` ok. Rota: `GET /v1/instances/:id/contacts/:phone/photo`.

