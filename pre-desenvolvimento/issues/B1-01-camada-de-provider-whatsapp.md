# B1-01: Camada de Provider de WhatsApp

**Tipo:** Implementação
**Módulo:** B1 — Camada de Provider
**Repositório:** `CRM_exponencial`

---

## Contexto

Hoje o CRM conversa com o WhatsApp **exclusivamente** pela API Oficial da Meta, e faz
isso chamando `graph.facebook.com` direto de dentro dos arquivos de negócio. São sete
pontos de envio espalhados em três arquivos.

Está em construção um **segundo canal**: um gateway próprio, que conecta o número do
cliente por leitura de QR Code. Ele fica em outro repositório
(`atacadoexponencial-maker/whatsapp-gateway`) e expõe uma interface HTTP própria.

Os dois canais vão **coexistir por número**: o mesmo workspace poderá ter um número na
Meta e outro no gateway, ao mesmo tempo.

Esta issue é o pré-requisito de tudo o que vem depois. Enquanto o CRM souber que existe
uma "Meta", nenhum outro canal encaixa.

**O objetivo é que, ao final, nenhum arquivo de negócio do CRM saiba qual provider está
em uso.**

---

## O que construir

Um ponto único por onde todo envio de WhatsApp passa.

1. Um **contrato** — o conjunto de operações de mensagem que o CRM conhece.
2. Uma **implementação Meta** — que faz exatamente o que o código faz hoje, movido de
   lugar, sem mudança de comportamento.
3. Um **seletor** — dado o número de origem, devolve a implementação certa.

Nesta issue existe **apenas o provider Meta**. O provider do gateway é issue posterior.
O seletor precisa estar pronto para receber o segundo, mas hoje sempre devolve o Meta.

### O que NÃO entra no contrato

Os arquivos abaixo também chamam `graph.facebook.com`, e **devem ficar como estão**:

- `src/app/(auth)/configuracoes/whatsapp/actions.ts` — OAuth, registro de número, inscrição de webhook
- `src/app/(auth)/configuracoes/templates/actions.ts` — templates de mensagem

São administração da conta Meta, não envio. O gateway não tem OAuth, não tem WABA e não
tem templates — abstrair isso seria criar interface para algo que só um dos dois lados
possui. Mexer neles nesta issue é **fora de escopo**.

---

## Arquivos

**Criar**

- `src/lib/whatsapp/tipos.ts` — o contrato e os tipos de resultado
- `src/lib/whatsapp/provider-meta.ts` — implementação da API Oficial
- `src/lib/whatsapp/index.ts` — o seletor, e o que o resto do CRM importa

**Modificar** — substituir a chamada direta pela chamada ao provider:

| Arquivo | Linhas de hoje | Função |
|---|---|---|
| `src/lib/whatsapp-envio.ts` | 46 | `enviarTextoWhatsApp` |
| `src/lib/campanhas.ts` | 58 | `processarCampanhasPendentes` |
| `src/app/(auth)/chat/actions.ts` | 33 | `enviarMensagem` (texto) |
| `src/app/(auth)/chat/actions.ts` | 125 | `enviarImagem` |
| `src/app/(auth)/chat/actions.ts` | 227 | `enviarDocumento` |
| `src/app/(auth)/chat/actions.ts` | 312 | `enviarVideo` |
| `src/app/(auth)/chat/actions.ts` | 397 | `enviarAudio` |

Não toque em nenhum outro arquivo. Se parecer que precisa, pare e pergunte — provavelmente
é escopo de outra issue.

---

## Contrato

Estas assinaturas são a **fronteira** desta issue. Outras issues (B6, B7, B8) serão
escritas contra elas, possivelmente semanas depois. Mudar qualquer uma exige avisar antes.

```ts
// src/lib/whatsapp/tipos.ts

/** Identifica de qual canal um número conectado é. */
export type CanalWhatsApp = "meta" | "gateway"

export type ResultadoEnvio =
  | { ok: true; mensagemId: string | null }
  | { ok: false; motivo: string }

export type MidiaEnvio = {
  url: string
  tipo: "imagem" | "video" | "audio" | "documento"
  legenda?: string
  nomeArquivo?: string
}

export type ProviderWhatsApp = {
  canal: CanalWhatsApp

  enviarTexto(destino: string, texto: string): Promise<ResultadoEnvio>
  enviarMidia(destino: string, midia: MidiaEnvio): Promise<ResultadoEnvio>
  marcarComoLida(mensagemId: string): Promise<ResultadoEnvio>

  /** Recursos que este canal suporta. Ver "Recursos por canal" abaixo. */
  suporta(recurso: RecursoWhatsApp): boolean
}

export type RecursoWhatsApp = "templates" | "midia" | "marcar_lida"
```

```ts
// src/lib/whatsapp/index.ts

/**
 * Resolve o provider a partir do número conectado do workspace.
 * Hoje devolve sempre o provider Meta.
 */
export async function resolverProvider(
  supabase: ServiceClient,
  workspaceId: string
): Promise<ProviderWhatsApp | null>
```

**Detalhe importante:** `enviarTexto` e `enviarMidia` devolvem `mensagemId` — é o `wamid`
que a Meta retorna hoje. Esse identificador é usado em dois lugares que **não podem
quebrar**: a atualização de status em `src/app/api/webhooks/whatsapp/route.ts` e o
relatório de entrega de campanhas (`campaign_recipients.wamid`).

---

## Recursos por canal

`suporta()` existe porque os dois canais não fazem as mesmas coisas:

| Recurso | Meta | Gateway |
|---|---|---|
| `templates` | sim | **não** — não existe template fora da API Oficial |
| `midia` | sim | sim |
| `marcar_lida` | sim | sim |

Nesta issue, o provider Meta devolve `true` para os três. A tabela existe para o segundo
provider ter onde se declarar.

---

## Regras de arquitetura do projeto

- **Toda lógica de negócio no backend.** Nada de provider em componente React.
- **Nenhum secret no frontend.** `access_token` da conexão nunca sai do servidor.
- **Reutilize o que existe.** Antes de criar função nova, procure em `src/lib/`. O
  padrão de acesso ao Supabase por service client já existe em `whatsapp-envio.ts`.
- **Não mude comportamento nesta issue.** O provider Meta deve fazer exatamente o que o
  código faz hoje — mesma URL, mesma versão da API (`v21.0`), mesmo corpo, mesmo
  tratamento de erro. É movimentação de código, não reescrita.

---

## Critérios de aceite

Cada linha precisa ser verificável olhando o código ou rodando o app.

- [ ] Nenhuma ocorrência de `graph.facebook.com` nos 3 arquivos de envio listados
- [ ] `grep -rn "graph.facebook.com" src` retorna **apenas** os 7 pontos de administração da conta Meta
- [ ] Enviar texto pelo Chat continua funcionando, e a mensagem aparece na conversa
- [ ] Enviar imagem, vídeo, áudio e documento pelo Chat continuam funcionando
- [ ] O `wamid` continua sendo gravado em `messages.wamid`
- [ ] Status de entrega e leitura continuam atualizando a mensagem (webhook intocado)
- [ ] Relatório de entrega de campanha continua correto
- [ ] Uma campanha disparada continua registrando `wamid` em `campaign_recipients`
- [ ] O motor de sequências continua enviando (usa `enviarTextoWhatsApp`)
- [ ] O motor de automações continua enviando
- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa

---

## Testes

Escreva testes para:

- `resolverProvider` devolve o provider Meta quando há conexão conectada
- `resolverProvider` devolve `null` quando o workspace não tem número conectado
- `enviarTexto` devolve `ok: true` com `mensagemId` quando a Meta responde 200
- `enviarTexto` devolve `ok: false` com motivo quando a Meta responde erro
- `enviarMidia` monta o corpo certo para cada um dos quatro tipos
- `suporta()` responde para os três recursos

O projeto usa **Vitest**. Rode com `npm test`.

---

## Fora de escopo

Não faça nesta issue, mesmo que pareça natural:

- Provider do gateway — é issue posterior
- Qualquer coisa em `configuracoes/whatsapp/actions.ts` ou `configuracoes/templates/actions.ts`
- Coluna `provider` em `whatsapp_connections` — vem com a issue do gateway
- Mudança no webhook `src/app/api/webhooks/whatsapp/route.ts`
- Melhorias de comportamento, retry, log ou tratamento de erro que não existam hoje

---

## Como saber que terminou

Rode `grep -rn "graph.facebook.com" src` e confira que só sobraram os pontos de
administração da conta. Depois abra o app, mande uma mensagem de texto e uma imagem pelo
Chat, e confirme que as duas chegam e aparecem na conversa.
