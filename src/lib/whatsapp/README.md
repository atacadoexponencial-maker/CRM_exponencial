# Camada de provider de WhatsApp

Todo envio de WhatsApp do CRM passa por aqui. Nenhum arquivo de negócio sabe
qual canal está em uso.

## Os três arquivos

| Arquivo | O que é |
|---|---|
| `tipos.ts` | O contrato. Só tipo, sem runtime. |
| `provider-meta.ts` | A implementação da API Oficial da Meta. |
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

**4. Ensine o seletor a escolher**, em `index.ts`. Hoje ele devolve Meta sempre.
A escolha deve sair de um campo da conexão no banco — não de variável de
ambiente e não do tipo de mensagem.

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
