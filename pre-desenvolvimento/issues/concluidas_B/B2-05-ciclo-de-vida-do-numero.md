# B2-05: Ciclo de vida do número — desconectar, reconectar e remover

**Tipo:** Implementação
**Módulo:** B2 — Conexão de Número por QR Code
**Repositório:** `CRM_exponencial`

## Contexto

Um número conectado pelo canal direto precisa poder sair e voltar. As três saídas não são a mesma coisa, e o cliente precisa entender a diferença: desconectar pausa e guarda a sessão, encerrar no aparelho derruba a sessão do celular, e remover apaga tudo — sessão, mídias e fila. Hoje `acoes-whatsapp.tsx` já tem os diálogos dessas ações para a Meta; esta issue faz o equivalente para o canal direto.

## O que construir

1. **Desconectar**, preservando a sessão: o número para de enviar e receber, e volta sem ler QR de novo.
2. **Reconectar** um número desconectado, voltando ao fluxo de pareamento quando a sessão não serve mais.
3. **Remover definitivamente**, com confirmação explícita, deixando claro que é irreversível e que a sessão é apagada no gateway.
4. **Diferença visível entre as três ações** na tela, para ninguém remover pensando que está pausando.

## Comportamentos da spec cobertos

- [x] Desconectar um número mantendo a possibilidade de reconectar
- [x] Reconectar um número desconectado lendo um novo QR Code
- [x] Remover definitivamente um número conectado

## Contrato do gateway

Fonte: `whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`, seção 4.1. Credencial em todas: `X-Instance-Token`.

| Uso | Método e caminho | Devolve | Efeito |
|---|---|---|---|
| Desconectar | `POST /instances/{id}/disconnect` | `{ state: "disconnected" }` | sessão **preservada** |
| Encerrar no aparelho | `POST /instances/{id}/logout` | `{ state: "disconnected" }` | encerra a sessão no celular |
| Remover | `DELETE /instances/{id}` | `{ state: "removed" }` | apaga sessão, mídias e fila |

- Reconectar depois de `disconnect` não precisa de QR novo; depois de `logout` precisa, e o caminho é o de B2-03.
- Erros: `instance_not_found` (404), `instance_forbidden` (403), `invalid_credentials` (401).
- Pendência conhecida do gateway, registrada em `whatsapp-gateway` (A1-02): **`disconnect` muda o estado sem fechar o socket.** Se durante a verificação manual o número continuar recebendo depois de desconectado, é essa pendência e não um defeito desta issue — registrar e avisar, não tentar corrigir aqui.

## Arquivos

- **Modificar:** `src/lib/whatsapp/gateway/cliente.ts` — desconectar, encerrar no aparelho e remover
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — as actions correspondentes, autorizando Admin no backend; o que a conexão guarda em cada caso (estado novo, e a linha apagada ou marcada na remoção)
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — as ações no cartão de cada número, com as três claramente distintas
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/acoes-canal-direto.tsx` — diálogos de confirmação, **no padrão de `acoes-whatsapp.tsx`**: um `useState` por ação, `Dialog` de `src/components/ui/dialog.tsx`, mensagem de erro vinda do retorno `{ erro?: string }` da action
- **Criar:** `src/test/whatsapp-ciclo-de-vida.test.ts` — as três ações, o estado gravado em cada uma e a recusa de quem não é Admin, com `fetch` falso e banco mockado

Reaproveitar: `acoes-whatsapp.tsx` já resolve este problema para a Meta — copiar o padrão, não o arquivo, e não alterar o fluxo da Meta.

## Depende de

- **B2-02** — cliente do gateway e conexão gravada
- **B2-03** — o pareamento, para onde a reconexão volta quando a sessão não serve
- **B2-04** — estado persistido, que estas ações atualizam

## Critérios de aceite

- [x] Desconectar deixa o número desconectado no CRM e no gateway, e a sessão continua existindo
- [x] Reconectar um número desconectado volta a conectá-lo; quando a sessão não serve mais, o fluxo de QR de B2-03 é oferecido
- [x] Remover pede confirmação explícita, avisa que é irreversível, e depois o número não aparece mais na lista
- [x] Um número removido não deixa resto que o CRM tente usar depois
- [x] As três ações são distinguíveis na tela, com o efeito de cada uma escrito em português
- [x] Gateway recusando ou fora do ar mostra mensagem legível e não deixa o CRM e o gateway em estados diferentes sem aviso
- [x] As três ações recusam quem não é Admin, no backend
- [x] `npm run build`, `npm run lint` e `npm test` passam
- [ ] **Verificação manual (pendente — exige o chip e o gateway no ar):** com a instância de teste do gateway, conferir que remover faz o aparelho sair de "Aparelhos conectados" no WhatsApp. Usar uma instância **sem o chip principal** — pendência já registrada no repo do gateway.

## Execução (17/09/2026)

Arquivo a mais, declarado: **`src/lib/whatsapp/gateway/ciclo-de-vida.ts`** — as três rotas,
o texto do efeito de cada uma e a tradução das recusas. A issue mandava pôr as rotas em
`cliente.ts`, que é transporte puro desde a B0-01.

**Ordem: gateway primeiro, CRM depois.** Se o gateway recusar, nada muda no CRM — o
contrário deixaria a tela dizendo "desconectado" com o número ainda enviando. A exceção é
`instance_not_found`: a instância já não existe do lado de lá, insistir não muda nada, e o
CRM acerta a própria cópia.

**Remover apaga a linha**, em vez de marcá-la como removida: o critério de aceite pedia que
não sobrasse resto que o CRM tentasse usar, e o `instance_token` de uma instância removida
não serve para mais nada.

**Banido não recebe botão de reconectar.** Ler o QR de novo não desfaz bloqueio do
WhatsApp, e oferecer seria mentira.

A verificação manual (remover faz o aparelho sair de "Aparelhos conectados") continua
aberta: depende do chip e do gateway publicado.

## Fora de escopo

- Corrigir a pendência A1-02 do gateway (`disconnect` não fecha o socket) — é do outro repositório
- Alterar o fluxo de desconexão/remoção da Meta em `acoes-whatsapp.tsx`
- Freio de emergência, retomada de envios e sinal de risco — é B4
- Receber os eventos de mudança de estado — é B6
