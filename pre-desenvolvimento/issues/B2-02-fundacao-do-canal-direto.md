# B2-02: Fundação do canal direto — banco, cliente do gateway e criação de instância

**Tipo:** Implementação
**Módulo:** B2 — Conexão de Número por QR Code
**Repositório:** `CRM_exponencial`

## Contexto

O CRM guarda conexão de WhatsApp numa tabela desenhada para a Meta e só para um número: `whatsapp_connections` exige `waba_id`, `phone_number_id` e `access_token` — três colunas que um número do canal direto não tem —, e `listarConexaoWhatsApp()` lê com `.maybeSingle()`, assumindo uma conexão por workspace. Esta issue abre o banco para os dois canais e para vários números, cria o cliente HTTP do gateway no backend e faz nascer a primeira instância. É o pré-requisito de todo o módulo B2.

## O que construir

1. **Migration** que faz `whatsapp_connections` caber nos dois canais:
   - coluna de canal, com os valores `meta` e `gateway`, e `meta` como padrão para as linhas que já existem;
   - `waba_id`, `phone_number_id` e `access_token` deixam de ser obrigatórias, porque só valem para a Meta;
   - identificação da instância do gateway e o token dela;
   - estado da conexão e motivo do último estado, com o vocabulário do contrato.
   - O token da instância é segredo: precisa ficar fora do alcance do cliente com RLS, legível só pelo backend.
2. **Cliente HTTP do gateway**, em `src/lib/whatsapp/gateway/`, servidor-only: endereço base e as duas credenciais lidas de variável de ambiente, tradução do formato de erro do contrato e um tipo de resultado que os chamadores possam testar sem rede.
3. **Criação de instância**: ao escolher o canal direto, o backend cria a instância no gateway, guarda `instance_id` e `instance_token` e passa a considerar aquele número como "em pareamento".
4. **Listagem por workspace**, com o canal de cada número — substituindo a leitura de conexão única.

## Comportamentos da spec cobertos

- [ ] Escolher conectar um número pelo canal direto
- [ ] Ver a lista de números conectados com o canal de cada um

## Contrato do gateway

Fonte: `whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`. Base: `https://<gateway>/v1`.

| Uso | Método e caminho | Credencial | Devolve |
|---|---|---|---|
| Criar instância | `POST /instances` com `{ workspace_id, webhook_url }` | serviço | `{ instance_id, instance_token, state }` |
| Listar instâncias do workspace | `GET /instances?workspace_id=` | serviço | `{ instances: [...] }` |

- **O `instance_token` é devolvido uma única vez, na criação.** Perdido, o número precisa ser removido e reconectado — gravar antes de responder ao cliente.
- Duas credenciais, nenhuma delas chega ao navegador: `X-Gateway-Service-Key` (criar e listar) e `X-Instance-Token` (tudo que se refere a um número). A de serviço **não** substitui a de instância.
- `webhook_url` é o endereço do CRM que vai receber os eventos. O receptor é a issue B6; aqui só se registra o endereço.
- Erros usados: `invalid_credentials` (401), `workspace_instance_limit_reached` (409), `invalid_payload` (400). Todo erro vem como `{ error: { code, message } }`, com `code` estável para o CRM decidir e `message` legível para mostrar ao admin.

## Arquivos

> **Nada de banco nem de cliente HTTP nasce aqui.** A migration de `whatsapp_connections`
> (canal, instância, estado e motivo, colunas da Meta anuláveis) é da **B1-02**, e o cliente
> HTTP do gateway (`src/lib/whatsapp/gateway/`) é da **B0-01**. Esta issue **usa** os dois.
> Se faltar coluna ou método, pare e ajuste a issue dona, não crie um segundo caminho.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `listarConexaoWhatsApp()` passa a listar as conexões do workspace com o canal de cada uma; entra a action de criar conexão pelo canal direto. Manter o padrão do arquivo: `"use server"`, autorização dentro da action lendo `profiles.role`, retorno `{ erro?: string }`, `revalidatePath` no fim.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — consumir a lista em vez da conexão única
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx` — trocar os dados fixos de B2-01 pelos reais
- **Modificar:** `.env.example` — endereço do gateway e as duas credenciais, com o aviso de que são segredo de backend
- **Modificar:** `src/integrations/supabase/types.ts` — **não editar à mão**; regerar com `supabase gen types typescript --linked` depois de aplicar a migration
- **Criar:** `src/test/whatsapp-gateway-cliente.test.ts` — cliente e tradução de erro, com `fetch` falso. Banco sempre mockado na Parte B (ver `pre-desenvolvimento/testes/plano-testes-B1.md`).

Reaproveitar: `resolverProvider` e a pasta `src/lib/whatsapp/` já existem, criados na B1-01; o cliente do gateway entra **ao lado** do `provider-meta.ts`, sem alterar o contrato da camada. O padrão de service client está em `src/integrations/supabase/service.ts`.

## Depende de

- **B1-01** — camada de provider de WhatsApp (concluída, mergeada em 17/09/2026)
- **B0-01** — cliente HTTP e credenciais do gateway. **Bloqueante:** é ele que fala com o gateway
- **B1-02** — migration de `whatsapp_connections` (canal, instância, colunas da Meta anuláveis). **Bloqueante**
- **B2-01** — protótipo, para a lista ter onde aparecer
- Migration precisa ser aplicada com `npx supabase db push --linked`; criar o `.sql` não aplica nada

## Critérios de aceite

- [ ] Aplicar a migration não quebra as conexões Meta que já existem: elas continuam legíveis e com canal `meta`
- [ ] Um workspace consegue ter mais de uma conexão, e a listagem devolve todas com o canal de cada uma
- [ ] Escolher o canal direto cria a instância no gateway e grava `instance_id` e `instance_token`
- [ ] O `instance_token` não aparece em nenhuma resposta ao navegador, e não é legível pelo cliente com RLS
- [ ] Nenhuma credencial do gateway aparece em componente de cliente nem em `NEXT_PUBLIC_*`
- [ ] Gateway fora do ar ou recusando: o admin vê a mensagem legível do erro, e nenhuma conexão pela metade fica no banco
- [ ] Limite de instâncias do workspace estourado (`workspace_instance_limit_reached`) mostra mensagem própria
- [ ] Ação de criar conexão recusa quem não é Admin, no backend
- [ ] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Pedir QR ou código de pareamento — é B2-03
- Acompanhar o estado até conectar — é B2-04
- Desconectar, reconectar e remover — é B2-05
- Receber eventos do gateway — é B6
- Enviar mensagem pelo canal direto — é a issue do provider do gateway
- Termo de responsabilidade — é B3-01. **Ordem:** B3-01 precisa estar no ar antes de esta tela permitir uma conexão real pelo canal direto.
