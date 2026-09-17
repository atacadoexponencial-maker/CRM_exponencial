# Camada de provider de WhatsApp

Todo envio de WhatsApp do CRM passa por aqui. Nenhum arquivo de negócio sabe
qual canal está em uso.

## Os três arquivos

| Arquivo | O que é |
|---|---|
| `tipos.ts` | O contrato. Só tipo, sem runtime. |
| `provider-meta.ts` | A implementação da API Oficial da Meta. |
| `provider-gateway.ts` | A implementação do gateway próprio (canal direto, QR Code). |
| `gateway/cliente.ts` | O transporte até o gateway: credenciais, tempo limite, tradução de erro. |
| `gateway/tipos.ts` | Os tipos da fronteira com o gateway, espelhando o contrato dele. |
| `index.ts` | O seletor, e o que o resto do CRM importa. |

## Como usar

```ts
import { resolverProvider } from "@/lib/whatsapp"

const provider = await resolverProvider(supabase, workspaceId)
if (!provider) {
  // Workspace sem número conectado — trate como o seu chamador já tratava.
}

const resultado = await provider.enviarTexto("5511999999999", "Olá")
if (resultado.ok) {
  // resultado.mensagemId é o wamid, e pode ser null
} else {
  // resultado.motivo é texto de log, não mensagem de usuário
}
```

Passe o cliente Supabase que você já usa. O seletor aceita tanto o service
client quanto o cliente SSR do chat — e, no segundo caso, a RLS continua valendo.

## Como adicionar um terceiro provider

É para isso que esta pasta existe. O roteiro tem quatro passos e nenhum deles
toca arquivo de negócio.

**1. Declare o canal** em `tipos.ts`:

```ts
export type CanalWhatsApp = "meta" | "gateway" | "seu_canal"
```

**2. Crie `provider-seu-canal.ts`** exportando uma função que devolve um
`ProviderWhatsApp`. Copie a forma de `provider-meta.ts`: receba as credenciais
prontas por parâmetro, não vá ao banco. Isso mantém o arquivo testável sem
Supabase.

**3. Declare o que o canal suporta.** O mapa `RECURSOS_SUPORTADOS` existe porque
os canais não fazem as mesmas coisas — o gateway, por exemplo, não tem template,
porque template não existe fora da API Oficial. Seja honesto aqui: quem chama
confia nessa resposta para decidir se oferece o recurso.

**4. Ensine o seletor a escolher**, em `index.ts`, na função
`providerDaConexao`. A escolha sai da coluna `canal` de `whatsapp_connections`
— não de variável de ambiente e não do tipo de mensagem. Conexão sem canal
preenchido é da Meta: é o default da coluna, e as linhas anteriores à `B1-02`
nasceram assim.

## O canal direto em duas linhas

O gateway é um serviço nosso, em outro repositório, com contrato próprio
(a cópia dele está em `pre-desenvolvimento/contrato-gateway-v1.md`). Duas coisas
dele vazariam para o resto do CRM se `provider-gateway.ts` não as escondesse:

- **Todo envio é enfileirado.** A resposta diz `queued: true`, que significa
  *aceita*, não *enviada*. A confirmação real chega depois, pelo evento
  `message.status`. O identificador devolvido grava em `messages.wamid`, no
  mesmo lugar do `wamid` da Meta — sem migration e sem coluna nova.
- **Ritmo e limites são do gateway, não do CRM.** Intervalo entre mensagens,
  tetos por hora e por dia, janela de envio e freio de emergência vivem lá. O
  CRM lê e configura (B4 e B5), nunca reimplementa.

Uma diferença não teve como esconder: **marcar como lida**. A Meta confirma uma
*mensagem* (`message_id`), o gateway confirma a *conversa* (`to`), e nenhum dos
dois deriva o outro. Por isso `marcarComoLida` recebe `AlvoDeLeitura`, com os
dois identificadores, e cada provider usa o que lhe serve. A alternativa era um
provider adivinhar — e, no gateway, o recibo iria para o contato errado.

## Duas regras que parecem detalhe e não são

**Chave só entra quando o valor foi passado.** Em `enviarMidia`, `caption` e
`filename` são incluídos com `!== undefined`, nunca por serem truthy. A razão é
concreta: a campanha manda `caption` mesmo quando a legenda é string vazia, e o
chat não manda o campo. Trocar por `if (midia.legenda)` faria a campanha parar
de mandar legenda vazia — mudança silenciosa de comportamento em produção.

**Falha de rede não vira `ok: false`.** Só resposta não-2xx vira. Exceção de
`fetch` sobe para o chamador. Isso existe porque os três chamadores tratam falha
de forma diferente — campanhas devolve falha dentro de um `try/catch` próprio, o
chat propaga para a UI, `whatsapp-envio` devolve `false`. Se o provider
engolisse a exceção, os três mudariam de comportamento de uma vez.

## O que esta camada não faz

Ela é a tradução da **saída**. A entrada de mensagem — o webhook em
`src/app/api/webhooks/whatsapp/route.ts` — não passa por aqui, e traduzir a
entrada é trabalho de outra issue.

Administração da conta Meta também fica de fora: OAuth, registro de número,
inscrição de webhook e templates continuam em
`src/app/(auth)/configuracoes/whatsapp/actions.ts` e
`src/app/(auth)/configuracoes/templates/actions.ts`. O motivo é que o gateway
não tem equivalente para nenhum deles — abstrair criaria interface para algo que
só um dos lados possui.

## Histórico

A camada nasceu na issue `B1-01`. O caminho percorrido, as alternativas
descartadas e os porquês estão em
`pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`.

O segundo provider e o seletor de dois caminhos vieram na `B1-02`, em
17/09/2026, junto da coluna `canal` em `whatsapp_connections`. O transporte
(`gateway/`) e a cópia do contrato vieram na `B0-01`.
