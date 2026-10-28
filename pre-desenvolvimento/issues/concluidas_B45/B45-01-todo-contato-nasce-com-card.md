# B45-01: Todo contato nasce com card na Entrada

**Tipo:** Implementação
**Página:** Contatos (Novo contato); recebimento de mensagens (API Oficial e canal direto); loja (pedido); Funil de Entrada
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

Todo jeito de criar contato passa a criar também o card dele na primeira etapa do Funil de Entrada: Novo contato, primeira mensagem pela API Oficial ou pelo canal direto, e pedido da loja de número novo. O card nasce com o dono do contato como atendente, ou sem atendente quando o contato não tem dono. Contato que já existe não ganha card repetido, e os contatos antigos sem card ganham o deles.

## Pronto quando

Na empresa de teste, um contato criado em Contatos → Novo contato aparece na primeira etapa do Funil de Entrada, e o perfil dele mostra o card. Nenhum contato da empresa fica sem card, e nenhum contato ganha dois cards na Entrada.

## Critérios de aceite

- **CA-B45-01** (automática) — Novo contato nasce com card na Entrada. Dado a empresa com o Funil de Entrada, quando o Admin cria o contato "Maria" em Contatos → Novo contato, então a Maria aparece no Funil de Entrada, na primeira etapa, sem atendente, e o perfil dela mostra esse card
- **CA-B45-02** (automática) — Quem manda a primeira mensagem nasce com card. Dado um número que a empresa nunca viu, quando chega a primeira mensagem dele, pela API Oficial ou pelo canal direto, então o contato novo tem um card na primeira etapa da Entrada, sem atendente
- **CA-B45-03** (automática) — Pedido da loja de número novo nasce com card. Dado um número que a empresa nunca viu, quando ele faz um pedido pela loja, então o contato novo tem um card na primeira etapa da Entrada, sem atendente
- **CA-B45-04** (automática) — Contato que já existe não ganha card repetido. Dado o contato "Ana", com o card dela na Entrada, quando a Ana manda outra mensagem, faz um pedido pela loja, ou sai da lixeira, então a Ana continua com um card só na Entrada
- **CA-B45-05** (automática) — Contatos antigos sem card ganham card. Dado contatos que hoje não têm card nenhum, alguns com dono e outros sem, quando a mudança entra no ar, então cada um tem um card na primeira etapa da Entrada, com o dono do contato como atendente (sem atendente quando o contato não tem dono), e os contatos que já tinham card não ganham outro

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-02 | Os contatos antigos sem card ganham o card na primeira etapa da Entrada, mesmo os que já compraram (CA-B45-05) | confirmada | Marcelle, 27/10/2026 ("tanto faz, são testes") |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-03 | Em qual funil e etapa nasce o card do contato novo? | respondida | Primeira etapa da Entrada. Marcelle, 27/10/2026 |
| PER-B45-08 | O card que nasce sozinho com o contato novo dispara as automações de "card entrou na etapa", como o "Novo lead"? | respondida | Sim, dispara o "card movido" e a reclassificação, como o Novo lead. Marcelle, 27/10/2026 |
| PER-B45-09 | Os cards criados de uma vez para os contatos antigos sem card (CA-B45-05) disparam automações? | respondida | Não disparam: é arrumação da base, não chegada de lead. Marcelle, 27/10/2026 |

## Cenários

### Happy Path
1. O Admin cria a "Maria" em Contatos → Novo contato. O contato é gravado e, logo depois, nasce o card dela no Funil de Entrada, etapa Lead, sem atendente. As automações de "card entrou em Lead" e a reclassificação (sem histórico → lead) disparam, como no Novo lead.
2. Chega a primeira mensagem de um número novo pela API Oficial (webhook da Meta) ou pelo canal direto (gateway). O contato nasce e o card dele também, antes de a conversa ser criada.
3. Um número novo faz um pedido pela loja. O contato nasce com o card.
4. A mensagem enviada pelo celular para um número novo (B25) cria o contato pelo mesmo caminho do canal direto, então também nasce com card.
5. Na publicação, a migration cria o card na Entrada (etapa Lead, com o atendente do contato) para todo contato que não tem card nenhum, empresa por empresa, sem disparar automação.

### Edge Cases
- Contato que já existe (mensagem nova, pedido novo, saiu da lixeira): o caminho de criação não roda, então nenhum card novo é tentado.
- Duas mensagens do mesmo número novo ao mesmo tempo: o índice único `pipeline_cards_um_por_funil` segura o segundo card; o erro 23505 é tratado como "já tem" e nada falha.
- "Novo lead" e "criar card na etapa" do funil continuam criando o contato pelo caminho deles (`localizarOuCriarContato` do pipeline) com o card que escolheram; não passam pelo card automático, então não há card repetido nem o aviso "já está no funil" para um contato recém-criado.
- Contato com card só na Recompra ou só num funil da empresa: já tem card, a migration não cria outro.
- Contato na lixeira sem card: a migration cria o card dele também (fica escondido junto com o contato e volta quando ele sai da lixeira).
- Pedido da loja de número que está na lixeira: continua como hoje (o pedido não tira da lixeira) e não cria card.

### Cenário de Erro
- Se o card não puder ser gravado na chegada de mensagem ou de pedido, a mensagem e o pedido seguem gravados: o card nunca derruba quem chegou.
- No Novo contato, se o card falhar, o contato fica criado e a tela recebe "Contato criado, mas o card no Funil de Entrada não foi criado."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B45-01 | automática | `src/test/contato-nasce-com-card.integration.test.ts` | Contato criado por `criarContato` tem um card na Entrada, etapa Lead, sem atendente, e o perfil (`buscarDadosContato`) mostra esse card |
| CA-B45-02 | automática | `src/test/contato-nasce-com-card.integration.test.ts` | Primeira mensagem de número novo pelo webhook da Meta (`POST` da rota) e pelo canal direto (`receberMensagem`) deixa o contato novo com um card na Entrada, etapa Lead, sem atendente |
| CA-B45-03 | automática | `src/test/contato-nasce-com-card.integration.test.ts` | Pedido da loja (`registrarPedido`) de número novo deixa o contato novo com um card na Entrada, etapa Lead, sem atendente |
| CA-B45-04 | automática | `src/test/contato-nasce-com-card.integration.test.ts` | A "Ana", com card na Entrada, manda outra mensagem, faz pedido e sai da lixeira por mensagem, e continua com um card só na Entrada |
| CA-B45-05 | automática | `src/test/contato-nasce-com-card.integration.test.ts` | A função de arrumação, rodada na empresa do teste, dá card na Entrada (etapa Lead) a cada contato sem card, com o atendente do contato ou sem atendente, e não cria card para quem já tinha (na Entrada ou só na Recompra) |

## Banco de Dados

- Migration `supabase/migrations/20261027000010_todo_contato_com_card.sql`:
  - Função `public.criar_cards_de_entrada_que_faltam(p_workspace_id uuid) returns integer`: insere em `pipeline_cards` (`workspace_id`, `contact_id`, `funil = 'entrada'`, `etapa = 'lead'`, `atendente_id = contacts.atendente_id`) um card para cada contato da empresa sem card nenhum e devolve quantos criou. `security definer`, `search_path = public`; EXECUTE só para `service_role` (revogado de public, anon e authenticated, como na B44-11).
  - No fim da migration, a função roda para cada empresa.
- Nenhuma coluna nova. O índice único `pipeline_cards_um_por_funil` (B22-26) já impede card repetido.

## Arquivos

- **Criar:** `src/lib/card-de-entrada.ts` — `criarCardDeEntrada(svc, workspaceId, contactId)`: grava o card na Entrada, etapa Lead, trata 23505 como "já tem", dispara `card_movido` e a reclassificação (reusa `dispararAutomacoes` de `@/lib/automacoes/fila` e `prepararGatilhoDeClassificacao` de `@/lib/automacoes/gatilhos-do-crm`); devolve `true` ou `false` e nunca lança
- **Criar:** `supabase/migrations/20261027000010_todo_contato_com_card.sql` — função de arrumação e a rodada dela em todas as empresas
- **Criar:** `src/test/contato-nasce-com-card.integration.test.ts` — testes dos CA-B45-01 a 05
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `criarContato` chama `criarCardDeEntrada` depois de gravar o contato novo
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — contato novo da API Oficial ganha o card logo depois de criado
- **Modificar:** `src/lib/whatsapp/recebimento.ts` — `acharOuCriarContato` chama `criarCardDeEntrada` só quando cria o contato (vale para o canal direto e para a mensagem enviada pelo celular)
- **Modificar:** `src/lib/catalogo/pedidos.ts` — `acharOuCriarContato` da loja chama `criarCardDeEntrada` só quando cria o contato
- **Criar:** `supabase/migrations/20261027000011_card_apaga_com_o_contato.sql` — apagar um contato de vez apaga os cards dele (cascata); acrescentado no /execute com o sim da Marcelle em 27/10/2026, porque com todo contato com card as limpezas dos testes deixavam empresas para trás
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — o pedido de número novo passa a conferir o card na Entrada, não mais "nenhum card" (regra nova; sim da Marcelle em 27/10/2026)
- **Modificar:** `src/test/catalogo-pedidos-crm.integration.test.ts` — o atendente vai para o card que já nasceu com o pedido, em vez de criar outro (sim da Marcelle em 27/10/2026)

## Checklist

- [x] Criar `src/lib/card-de-entrada.ts` com `criarCardDeEntrada`
- [x] Chamar em `criarContato` (contatos/actions.ts), com o aviso quando o card falhar
- [x] Chamar no contato novo do webhook da Meta (route.ts)
- [x] Chamar no contato novo de `acharOuCriarContato` (recebimento.ts)
- [x] Chamar no contato novo de `acharOuCriarContato` da loja (pedidos.ts)
- [x] Escrever a migration com `criar_cards_de_entrada_que_faltam` e rodar `npx supabase db push --linked`
- [x] Escrever `src/test/contato-nasce-com-card.integration.test.ts`
- [x] Rodar os testes que passam por esses caminhos (classificação de contatos, webhook, gateway, loja, contatos), por causa da L-05, e o `tsc` do projeto (L-07)
