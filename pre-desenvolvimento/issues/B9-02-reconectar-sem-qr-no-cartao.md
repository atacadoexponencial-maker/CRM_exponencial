# B9-02: Botão Reconectar volta sem QR Code, e cai para o QR do mesmo número

**Tipo:** Implementação
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`
**Depende de:** B9-01 (forma aprovada) e A10-02 (operação no ar)

## Descrição

Ligar o botão Reconectar do cartão à operação Reconectar do gateway: mostra
"Reconectando…" sem aceitar segundo clique, passa a "conectado" sozinho com o
aviso de sucesso, e, se a sessão acabou, explica o motivo e oferece um QR Code
novo para o mesmo número. Os textos de efeito das três ações ficam como
aprovados na B9-01.

Cobre, em "CRM — Configurações → WhatsApp", os comportamentos: Desconectar,
Reconectar sem QR, Ver a reconexão em andamento, Ver o número voltar sem
recarregar, Cair para o QR quando a sessão acabou, Ver o motivo de outras
recusas, Não criar número novo e Conversas continuam no número.

## Pronto quando

Com um chip real, no CRM publicado: desconectar e depois clicar em Reconectar
traz o número de volta sem ler QR e sem F5, e responder numa conversa antiga
funciona. Removendo o aparelho pelo celular durante a pausa, Reconectar mostra o
motivo e abre o QR do mesmo número; lido o QR, a lista continua com um número só.

## Cenários

### Happy Path
1. Admin clica em Reconectar num número desconectado. A lista guarda
   "reconectando" para esse número: o cartão mostra o selo "Conectando", o
   botão vira "Reconectando…" desabilitado.
2. A action `reconectarNumeroCanalDireto(conexaoId)` chama
   `POST /instances/{id}/reconnect` com a credencial da instância; o gateway
   responde `connecting`; o CRM grava `status = connecting`, `state_reason = null`.
3. A lista pergunta a cada 3 s por `sincronizarEstadoDoNumero(conexaoId)`. Ao
   vir `connected`, o CRM grava e a lista recarrega; o cartão passa a
   "Conectado" com o aviso "Número reconectado. Ele já pode receber e enviar
   mensagens." Sem F5.

### Edge Cases
- **Sessão acabou.** Duas formas: a recusa imediata `no_saved_session` (409)
  ou, depois de `connecting`, o estado `disconnected` com
  `session_closed_on_device` (chega pelo webhook; a sondagem lê o motivo já
  gravado no CRM em vez de sobrescrevê-lo com nulo). Nos dois casos o cartão
  mostra o aviso "Não foi possível reconectar: a sessão foi encerrada no
  aparelho. Para voltar, leia um QR Code novo — o número continua o mesmo." com
  o botão "Ler QR Code novo", que abre a tela de QR **da mesma instância**
  (`pedirQrCodeCanalDireto(conexaoId)`), sem criar número.
- **Outras recusas.** `instance_banned` → "O WhatsApp bloqueou este número.";
  gateway fora → "O gateway não respondeu. Nada foi alterado; tente novamente
  em instantes."; instância inexistente → mensagem já existente. O cartão volta
  ao estado anterior com o motivo em vermelho.
- **Segundo clique**: o botão fica desabilitado enquanto "reconectando".
- **Já conectado/conectando no gateway**: responde o estado atual; o CRM só
  reflete.
- **Sondagem sem resposta por 60 s**: para e mostra "O gateway não confirmou a
  reconexão. Tente de novo."
- Textos de efeito das ações: os aprovados na B9-01 (`TEXTOS_DE_EFEITO` do
  protótipo) substituem os de `EFEITO` em `ciclo-de-vida.ts`.

### Cenário de Erro
- Gateway aceitou mas o CRM não gravou: a action devolve erro pedindo para
  tentar de novo; a próxima sondagem/recarga acerta a cópia.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `src/lib/whatsapp/gateway/tipos.ts` — `no_saved_session` no
  catálogo de códigos (contrato, seção 5).
- **Modificar:** `src/lib/whatsapp/gateway/ciclo-de-vida.ts` —
  `reconectarInstancia(cliente, id, token)` → `{ ok, estado } | { ok:false,
  erro, precisaQr, jaNaoExiste }`; `EFEITO` com os textos da B9-01.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` —
  `reconectarNumeroCanalDireto(conexaoId)`, `sincronizarEstadoDoNumero(conexaoId)`;
  `pedirQrCodeCanalDireto(conexaoId?)` e `sincronizarEstadoCanalDireto(conexaoId?)`
  ganham o id opcional (sem id, comportamento atual).
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/acoes-canal-direto.tsx`
  — Reconectar chama `onReconectar` (sem QR); prop `reconectando` mostra
  "Reconectando…" desabilitado; ícone `RefreshCw`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx`
  — estado de reconexão por número, sondagem, avisos `voltou`/`sessao_acabou`
  com "Ler QR Code novo", QR e sondagem pela instância alvo.
- **Modificar:** `src/test/whatsapp-ciclo-de-vida.test.ts` — casos de
  `reconectarInstancia`: sucesso, `no_saved_session`, `instance_banned`, sem resposta.

Reutilizar: `AvisoDoNumero` (B9-01), `CartaoNumero`, `consultarEstado`,
`aplicarEstadoDaInstancia`, `pedirQrDoGateway`, `adminDoWorkspace`,
`conexaoDoCanalDiretoPorId`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] `reconectarInstancia` no ciclo de vida, com testes
- [x] Actions de reconectar e sondar por id; QR e sondagem aceitam id
- [x] Botão Reconectar sem QR, com "Reconectando…" e sem segundo clique
- [x] Cartão volta a "Conectado" sozinho com aviso de sucesso
- [x] Sessão acabada cai para o QR do mesmo número
- [x] Textos de efeito da B9-01 aplicados
- [x] `npm run lint`, `npm run build` e testes passando
- [ ] Teste com chip real no CRM publicado (a Marcelle)
