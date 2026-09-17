# B2-03: Pareamento — QR Code, validade e código numérico

**Tipo:** Implementação
**Módulo:** B2 — Conexão de Número por QR Code
**Repositório:** `CRM_exponencial`

## Contexto

Com a instância criada (B2-02), o número ainda não está conectado: falta o cliente apontar o WhatsApp do celular para um código. O gateway entrega o código de duas formas — QR para leitura e código numérico digitado no aparelho — e cada um vence em pouco tempo. Esta issue liga a tela de pareamento ao gateway e resolve a expiração.

## O que construir

1. **Pedido do QR Code**, pelo backend, devolvendo à tela o conteúdo do código e o instante em que ele vence.
2. **Desenho do QR no CRM.** O gateway manda o conteúdo bruto, não uma imagem — quem desenha é o CRM. Escolher como desenhar é parte desta issue; não existe biblioteca de QR no projeto hoje (`package.json` conferido), então entra dependência nova ou geração própria do SVG.
3. **Contador de validade**, mostrando ao cliente quanto tempo resta para ler.
4. **Renovação**: vencido sem leitura, o cliente pede um código novo e a tela volta a mostrar um código válido.
5. **Caminho alternativo por código digitado**: o admin informa o número e recebe o código de pareamento para digitar no aparelho.

## Comportamentos da spec cobertos

- [x] Visualizar o QR Code para leitura
- [x] Ver o tempo restante de validade do QR Code
- [x] Obter um novo QR Code quando o atual expira
- [x] Optar por parear usando código digitado em vez de QR Code

## Contrato do gateway

Fonte: `whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`, seção 4.2.

| Uso | Método e caminho | Corpo | Devolve |
|---|---|---|---|
| Código visual | `POST /instances/{id}/pair/qr` | — | `{ qr, expires_at }` |
| Código digitado | `POST /instances/{id}/pair/code` | `{ phone_number }` | `{ pairing_code, expires_at }` |

- Credencial: `X-Instance-Token`, a da instância. A de serviço **não** pareia. O token fica no backend, lido da conexão gravada em B2-02 — nunca viaja até o navegador.
- `qr` é o **conteúdo bruto** do código, não uma imagem.
- **Expiração:** vencido sem leitura, o gateway renova sozinho e entrega um evento `instance.state` com `pairing`. O CRM chama o endpoint de novo para pegar o código atual. Ou seja: renovar é pedir de novo, não é esperar por push.
- Erros possíveis: `instance_not_found` (404), `instance_forbidden` (403), `invalid_credentials` (401), `invalid_payload` (400) no número mal formado.

## Arquivos

- **Modificar:** `src/lib/whatsapp/gateway/cliente.ts` — os dois pedidos de pareamento
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — actions de pedir QR e pedir código, autorizando Admin no backend e resolvendo o `instance_token` a partir da conexão do workspace
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx` — código real, contador e ação de renovar, no lugar dos dados fixos de B2-01
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/pareamento-por-codigo.tsx` — número informado e código real
- **Modificar:** `package.json` — se a escolha for biblioteca de QR, ela entra aqui; conferir a documentação oficial antes de implementar, como manda o `CLAUDE.md`
- **Criar:** `src/test/whatsapp-pareamento.test.ts` — pedido de QR, pedido de código, expiração e renovação, com `fetch` falso e banco mockado

Reaproveitar: o cliente HTTP, os tipos e a tradução de erro são os de B2-02; nada de segunda implementação de chamada ao gateway.

## Depende de

- **B2-02** — instância criada e `instance_token` gravado
- **B3-01** — sem aceite do termo não existe instância para parear; o termo precisa estar no ar antes desta tela funcionar de verdade

## Critérios de aceite

- [x] A tela mostra um QR válido, desenhado a partir do conteúdo devolvido pelo gateway
- [x] O contador mostra o tempo restante e chega a zero
- [x] Pedir um código novo depois de vencido devolve um código diferente e válido
- [x] O caminho por código digitado devolve o código de pareamento para o número informado
- [x] Número mal formado no caminho por código mostra mensagem legível, não erro cru
- [x] O `instance_token` não aparece em nenhuma resposta ao navegador nem no HTML da página
- [x] Instância inexistente ou credencial recusada mostra mensagem legível
- [x] Pedir QR ou código recusa quem não é Admin
- [x] `npm run build`, `npm run lint` e `npm test` passam

## Execução (17/09/2026)

**Biblioteca de QR escolhida: `qrcode`** (a de referência em Node, usada pelo próprio
ecossistema do Baileys), com o desenho **no servidor**. O navegador recebe a imagem pronta
em data URL. Duas razões: o conteúdo bruto do código não precisa circular no cliente — ele
é a credencial de pareamento por 60 segundos — e o navegador não carrega biblioteca nenhuma
para isso. Nível de correção `M`, o mesmo do WhatsApp Web.

Arquivo a mais, declarado: **`src/lib/whatsapp/gateway/pareamento.ts`**. A issue mandava
pôr os dois pedidos em `cliente.ts`, mas ali é transporte puro — misturar desenho de QR e
tradução de mensagem quebraria a separação que a B0-01 estabeleceu. O `cliente.ts` ficou
intocado.

O número é conferido no backend **antes** de ir à rede: o gateway recusaria com
`invalid_payload`, e uma viagem para descobrir o que já se sabia não ajuda ninguém.

## Fora de escopo

- Saber que a leitura deu certo e refletir isso na tela — é B2-04
- Desconectar, reconectar e remover — é B2-05
- Receber o evento `instance.state` — é B6
- Enviar mensagem pelo canal direto
