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

---

# Planejamento (`/plan` — 16/09/2026)

## Cenários

### Happy Path

1. Um dos sete pontos de negócio precisa mandar mensagem.
2. Chama `resolverProvider(supabase, workspaceId)`.
3. O seletor busca em `whatsapp_connections` a conexão `status = "connected"` do
   workspace e devolve uma instância do provider Meta fechada sobre `phone_number_id` e
   `access_token` daquela conexão.
4. O chamador invoca `enviarTexto` ou `enviarMidia`.
5. O provider monta exatamente a mesma requisição de hoje e devolve
   `{ ok: true, mensagemId }`.
6. O chamador grava o `wamid` e atualiza a conversa — **igual ao que já fazia**.

### Edge Cases

- **Workspace sem número conectado:** `resolverProvider` devolve `null`. Cada chamador
  trata como já tratava a ausência de `conn`: `whatsapp-envio` devolve `false`, o chat
  lança `"Conexão WhatsApp não encontrada"`, campanhas marca os pendentes como falhos.
- **Resposta 200 sem `messages[0].id`:** `mensagemId` vira `null`. É o comportamento de
  hoje (`?? null`) e o banco aceita `wamid` nulo.
- **Legenda vazia vs. legenda ausente:** `campanhas.ts:42` manda `caption` mesmo quando
  a string é vazia; `chat/actions.ts:135` não manda o campo. A regra é `legenda !==
  undefined`, nunca truthiness. Vale igual para `filename`.
- **Documento por campanha leva `caption`; documento pelo chat não.** Diferença real
  entre os dois chamadores, não descuido.

### Cenário de Erro

- **Resposta não-2xx:** `{ ok: false, motivo }`, com `motivo` no formato
  `Meta API error: {status} - {corpo}`. Unificação aceita na decisão 5.4 — hoje
  documento e vídeo não incluem o corpo.
- **Exceção de rede:** o provider **não** captura. A exceção sobe e cada chamador mantém
  o tratamento atual — `campanhas.ts` já tem `try/catch` próprio que devolve
  `{ ok: false, wamid: null }`, o chat propaga para a UI, `whatsapp-envio` não captura.

## Banco de Dados

Nenhuma alteração de schema. Apenas leitura, já existente:

- Tabela `whatsapp_connections`
  - `phone_number_id` (text) — identificador do número na Meta, vai na URL
  - `access_token` (text) — credencial da conexão, vai no header `Authorization`
  - `status` (text) — o seletor filtra por `"connected"`
  - `workspace_id` (uuid) — isolamento multi-tenant

> A coluna `provider` **não** entra nesta issue — é da issue do gateway.

## Arquivos

- **Criar:** `src/lib/whatsapp/tipos.ts` — contrato e tipos de resultado, sem runtime
- **Criar:** `src/lib/whatsapp/provider-meta.ts` — único arquivo que conhece `wamid`,
  `v21.0` e `messaging_product`
- **Criar:** `src/lib/whatsapp/index.ts` — seletor `resolverProvider` e reexportações
- **Criar:** `src/lib/whatsapp/README.md` — como plugar um terceiro provider
- **Modificar:** `src/lib/whatsapp-envio.ts` — linha 46, `enviarTextoWhatsApp`
- **Modificar:** `src/lib/campanhas.ts` — linha 58, `enviarParaDestinatario`
- **Modificar:** `src/app/(auth)/chat/actions.ts` — linhas 33, 125, 227, 312 e 397
- **Criar:** `src/test/whatsapp-provider.test.ts` — seletor, envio, marcar lida, suporta
- **Criar:** `src/test/whatsapp-provider-corpo.test.ts` — corpo byte a byte

> `src/lib/whatsapp/README.md` não estava na lista original do spec. É adição
> deliberada, combinada com Luan, registrada na seção 7.1 do documento de decisões.

## Código reutilizável encontrado

- **Padrão de mock do Supabase:** `src/test/automacoes.test.ts:14` — builder `chain()`
  que imita o encadeamento do supabase-js. Importar o padrão, não reescrever.
- **Tipo do service client:** `type ServiceClient = ReturnType<typeof
  createServiceClient>`, já usado em `whatsapp-envio.ts:7` e `campanhas.ts:13`. Nem
  `createServiceClient` nem `createClient` passam o generic `Database`, então os dois
  resolvem para o mesmo tipo — o cliente do chat, com RLS, é aceito sem cast.
- **Leitura da conexão:** a query com `.eq("status","connected").limit(1).maybeSingle()`
  aparece idêntica em quatro lugares. Passa a existir uma vez só, no seletor.

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] `src/lib/whatsapp/tipos.ts` com `CanalWhatsApp`, `ResultadoEnvio`, `MidiaEnvio`,
      `RecursoWhatsApp` e `ProviderWhatsApp`, nas assinaturas literais do contrato
- [x] `src/lib/whatsapp/provider-meta.ts` com `enviarTexto`, `enviarMidia`,
      `marcarComoLida` e `suporta`
- [x] Corpo da requisição idêntico ao de hoje nos cinco tipos, com a regra
      `valor !== undefined` para `caption` e `filename`
- [x] `src/lib/whatsapp/index.ts` com `resolverProvider`, devolvendo `null` sem conexão
- [x] `src/lib/whatsapp-envio.ts` usando o provider, mantendo o retorno `boolean`
- [x] `src/lib/campanhas.ts` usando o provider dentro do `try/catch` que já existe
- [x] Os cinco pontos de `chat/actions.ts` usando o provider, mantendo o `throw`
- [x] Cabeçalho em português no topo de cada módulo novo, no padrão do repo
- [x] `src/lib/whatsapp/README.md` explicando como adicionar um terceiro provider
- [x] `grep -rn "graph.facebook.com" src` não devolve nada nos 3 arquivos de envio
- [x] `npm run build` passa
- [x] `npm run lint` passa
- [x] Suíte segura passa (`npx vitest run` nos 7 arquivos que não escrevem no banco)
- [x] Suíte completa executada: 120 de 140 passando. As 20 falhas são `Request rate
      limit reached` do Supabase Auth, em 3 arquivos que não importam nada do que
      esta issue tocou — ver seção 10.4 do documento de decisões
- [x] Testes novos do `plano-testes-B1.md` passando
- [x] Seção 8.2 do documento de decisões atualizada com o que mudou de rota
- [ ] **Prova manual:** texto e imagem pelo Chat, com número Meta conectado
      (bloqueada — ver seção 8.2 do documento de decisões)

## Fora de escopo — confirmado no planejamento

Encontrados durante a pesquisa e **deliberadamente não tocados**:

- `config_id` fixo em `wizard-conexao.tsx:122`, apontando para app apagado
- `conectar-whatsapp-button.tsx` e `conectar-teste-button.tsx`, sem importadores
- Constantes `MOCK_*` não usadas em cinco arquivos
- Ausência de revalidação do token da conexão (`status` fica "connected" para sempre)
