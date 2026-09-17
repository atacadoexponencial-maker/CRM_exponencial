# Plano de Testes — Parte B, Módulo B1: Camada de Provider de WhatsApp

> Documento de referência para implementação dos testes automatizados do módulo B1.
> Stack: Vitest (unit). Sem Playwright — B1 não tem superfície de UI.

---

## Contexto

O módulo B1 cria a camada que isola o CRM do canal de WhatsApp em uso. A B1-01 move
sete pontos de envio que hoje chamam `graph.facebook.com` direto de dentro dos arquivos
de negócio para um provider único.

É uma **refatoração que preserva comportamento**. Isso muda a natureza do teste: o
critério não é "funciona", é "está idêntico ao que já estava em produção". Testar que
uma mensagem é enviada prova pouco; o que precisa ser provado é que o corpo da
requisição, a URL, a versão da API e o tratamento de erro continuam exatamente os
mesmos.

**Prioridade máxima:** igualdade byte a byte do corpo da requisição, e preservação do
`wamid` — que alimenta a atualização de status no webhook e o relatório de entrega de
campanhas.

---

## Regra de banco — diferente dos módulos 0 a 7

Os planos dos módulos 0 a 7 mandam os testes de integração baterem no Supabase real.
**Para a Parte B isso não vale**, e a razão é concreta: hoje existe uma única instância
Supabase, e o app em produção lê dela. Rodar teste que escreve significa escrever na
base que o cliente usa.

**Nesta parte, o banco é sempre mockado.** O padrão a seguir é o de
`src/test/automacoes.test.ts`: `vi.mock` em `@/integrations/supabase/service` e um
builder que imita a chain do supabase-js.

A chamada HTTP à Meta também é sempre interceptada — nenhum teste desta parte pode
abrir conexão de rede.

Consequência positiva: a suíte inteira do B1 roda em qualquer máquina, sem `.env`
apontando para lugar nenhum, sem número conectado e sem risco.

---

## 1. Unit Tests (Vitest)

### Seletor de provider

Arquivo: `src/test/whatsapp-provider.test.ts`

```
✅ resolverProvider devolve o provider Meta quando existe conexão com status "connected"
✅ resolverProvider devolve null quando o workspace não tem número conectado
✅ resolverProvider devolve null quando a conexão existe mas está desconectada
✅ O provider devolvido tem canal === "meta"
```

### Envio de texto

Arquivo: `src/test/whatsapp-provider.test.ts`

```
✅ enviarTexto devolve ok: true com mensagemId quando a Meta responde 200
✅ enviarTexto devolve ok: false com motivo quando a Meta responde erro
✅ enviarTexto devolve mensagemId null quando a resposta 200 não traz messages[0].id
✅ Exceção de rede no fetch sobe para o chamador — o provider não engole
```

### Corpo da requisição — igualdade byte a byte

Arquivo: `src/test/whatsapp-provider-corpo.test.ts`

Este é o grupo que carrega a issue. Cada caso intercepta o `fetch`, captura o corpo
montado pelo provider e compara com o corpo que o código anterior montava.

```
✅ URL é https://graph.facebook.com/v21.0/{phone_number_id}/messages em todos os envios
✅ Header Authorization é "Bearer {access_token}" da conexão
✅ Texto: corpo é { messaging_product, to, type: "text", text: { body } }
✅ Imagem: corpo é { messaging_product, to, type: "image", image: { link } }
✅ Imagem com legenda: a chave caption aparece no objeto image
✅ Imagem sem legenda: a chave caption NÃO aparece — nem como string vazia, nem como undefined
✅ Imagem com legenda vazia (""): a chave caption aparece, com valor ""
✅ Documento pelo Chat: document traz link e filename, SEM caption
✅ Documento por Campanha: document traz link, caption e filename
✅ Documento sem nome de arquivo: a chave filename não aparece
✅ Vídeo: corpo é { messaging_product, to, type: "video", video: { link } }
✅ Áudio: corpo é { messaging_product, to, type: "audio", audio: { link } }
```

> A distinção entre *legenda ausente* e *legenda vazia* não é capricho: hoje a campanha
> manda `caption` mesmo quando vazia e o chat não manda o campo. Vale para imagem **e
> para documento** — a campanha manda `caption` no documento também
> (`campanhas.ts:45`), o chat não (`chat/actions.ts:237`). Os dois comportamentos
> precisam sobreviver, ou um dos dois chamadores muda em silêncio.

### Formato do motivo de erro

Arquivo: `src/test/whatsapp-provider-corpo.test.ts`

Hoje os sete pontos não concordam entre si. Texto, imagem e áudio leem o corpo do erro
(`Meta API error: {status} - {corpo}`); documento e vídeo não (`Meta API error:
{status}`). A decisão 5.4 do documento de decisões unifica no formato com corpo.

```
✅ motivo inclui status e corpo da resposta, para todos os tipos
✅ motivo é montado mesmo quando a resposta de erro tem corpo vazio
```

> **Esta é a única mudança de comportamento deliberada da issue.** Foi aceita porque os
> três consumidores (`painel-conversa.tsx:165`, `:235`, `:270`) fazem `catch {}` e
> descartam o texto — ele nunca chega ao usuário, só ao log do servidor. Registrada aqui
> para que a suíte não seja lida como prova de igualdade absoluta.

### Marcar como lida

Arquivo: `src/test/whatsapp-provider.test.ts`

```
✅ marcarComoLida monta POST para v21.0/{phone_number_id}/messages
✅ Corpo é { messaging_product, status: "read", message_id }
✅ Devolve ok: false com motivo quando a Meta responde erro
```

> Nasce sem chamador — nenhum ponto do CRM marca mensagem como lida na Meta hoje. O
> teste existe porque o contrato da issue pede a operação, e porque a issue do gateway
> vai encostar nela.

### Declaração de recursos

Arquivo: `src/test/whatsapp-provider.test.ts`

```
✅ suporta("templates") devolve true no provider Meta
✅ suporta("midia") devolve true no provider Meta
✅ suporta("marcar_lida") devolve true no provider Meta
```

---

## 2. Integration Tests

**Nenhum nesta issue.** Ver a regra de banco acima.

Os comportamentos que normalmente pediriam teste de integração — `wamid` gravado em
`messages`, `campaign_recipients` atualizado, status de entrega — são cobertos por
asserção sobre o cliente Supabase mockado: o teste verifica que `insert`/`update` foi
chamado com o valor certo, sem precisar de banco.

---

## 3. E2E

**Nenhum nesta issue.** B1-01 não altera nenhuma tela.

---

## 4. O que estes testes deliberadamente NÃO cobrem

Registrado para que ninguém leia a suíte verde como prova do que ela não prova:

- **Que a Meta aceita a requisição.** Isso depende de número conectado e token válido,
  e é verificação manual — ver seção 8.2 de
  `pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`.
- **Que a mensagem chega no aparelho.** Mesma verificação manual.
- **O webhook de entrada.** Intocado por esta issue, por critério de aceite explícito.

---

## 5. Ordem de implementação

| Após implementar | Testes a criar |
|---|---|
| `tipos.ts` | Nenhum — só tipos, sem runtime |
| `provider-meta.ts` | `whatsapp-provider-corpo.test.ts` (corpo byte a byte) |
| `index.ts` (seletor) | `whatsapp-provider.test.ts` (seletor, envio, marcar lida, suporta) |
| Os 7 pontos de chamada | Nenhum novo — a suíte existente é a rede de segurança |

Rodar com:

```bash
npx vitest run src/test/whatsapp-provider.test.ts src/test/whatsapp-provider-corpo.test.ts
```
