# B30-02: Pedido do catálogo fechado vira compra do contato

**Tipo:** Implementação
**Página:** Pedidos do catálogo (detalhe do pedido), perfil do contato (histórico de compras e timeline)
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

Marcar um pedido do catálogo como Fechado cria no contato vinculado uma compra com a data
do fechamento, o valor e as peças do pedido, origem "Catálogo", o número do pedido e quem
fechou como atendente. Reabrir ou cancelar o pedido desfaz a compra; fechar de novo cria
de novo, sem duplicar. Pedido sem contato fecha sem gerar compra. Compra de origem
"Catálogo" não pode ser editada nem apagada por fora do pedido. Pedidos que já estavam
Fechados antes desta série ganham a compra deles uma vez só, com a data de fechamento do
histórico do pedido e sem atendente. No perfil, o histórico mostra as duas origens lado a
lado, o número do pedido abre o pedido, e a timeline mostra a compra do catálogo uma vez.

Depende da B30-01 (os campos novos da compra).

## Pronto quando

Na empresa de teste, um pedido da loja vinculado a um contato é marcado como Fechado e, na
hora, o histórico do contato ganha a compra com peças, origem "Catálogo" e o atendente que
fechou; clicar no número do pedido abre o pedido. Voltar o pedido para Em atendimento faz a
compra sumir; fechar de novo faz voltar uma só. Os pedidos que já estavam fechados antes
aparecem como compra nos contatos deles.

## Critérios de aceite

- **CA-B30-01** (automática) — Fechar o pedido registra a compra no contato. Dado um pedido do catálogo vinculado a um contato, em Novo ou Em atendimento, com total de R$ 350,00 e 7 peças, quando o vendedor marca o pedido como Fechado, então o contato ganha uma compra com a data do fechamento, valor R$ 350,00, 7 peças, origem "Catálogo", o número do pedido e o atendente igual a quem fechou.
- **CA-B30-02** (automática) — Reabrir ou cancelar o pedido desfaz a compra. Dado um pedido Fechado cuja compra já aparece no contato, quando o vendedor volta o pedido para Em atendimento, ou o cancela, então a compra some do histórico do contato e deixa de contar no dashboard.
- **CA-B30-03** (automática) — Fechar de novo cria a compra de novo, sem duplicar. Dado um pedido que foi fechado, reaberto e fechado outra vez, quando o vendedor olha o histórico de compras do contato, então existe exatamente uma compra ligada a esse pedido.
- **CA-B30-04** (automática) — Pedido sem contato fecha sem gerar compra. Dado um pedido do catálogo sem contato vinculado, quando o vendedor marca o pedido como Fechado, então o pedido fica Fechado e nenhuma compra é criada.
- **CA-B30-21** (automática) — Pedidos fechados antes da mudança ganham compra. Dado um pedido do catálogo que já estava Fechado antes desta série, vinculado a um contato, e que ainda não tem compra, quando a mudança entra no ar, então o contato ganha uma compra com a data em que o pedido foi marcado como Fechado (do histórico do pedido), o valor e as peças do pedido, origem "Catálogo" e sem atendente; rodar de novo não cria uma segunda compra.
- **CA-B30-05** (automática) — Compra do catálogo não se apaga nem se edita à mão. Dado uma compra com origem "Catálogo", quando alguém tenta alterá-la ou removê-la por fora do pedido, então a operação é recusada; o jeito de desfazer é reabrir ou cancelar o pedido.
- **CA-B30-11** (automática) — Histórico mostra as duas origens com as colunas novas. Dado um contato com uma compra manual (Pix, 3 peças) e um pedido do catálogo fechado, quando o usuário abre o perfil do contato, então a tabela lista as duas compras, com peças, forma de pagamento, atendente e origem, e o total em compras soma as duas.
- **CA-B30-12** (automática) — Número do pedido leva ao pedido. Dado uma compra de origem "Catálogo" no histórico, quando o usuário clica no número do pedido, então abre o detalhe daquele pedido do catálogo.
- **CA-B30-15** (automática) — Compra do catálogo aparece uma vez na timeline. Dado um pedido do catálogo que foi fechado, quando o usuário olha a timeline do contato, então há um evento "Compra" com o número do pedido e um evento "Pedido do catálogo" da chegada do pedido; a compra não aparece duas vezes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-02 | A data da compra gerada pelo catálogo é o dia em que o pedido foi marcado como Fechado, não o dia em que o pedido chegou. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-03 | Pedido sem contato vinculado fecha normalmente e não gera compra. Vincular o contato depois não cria a compra retroativamente. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-04 | Compra de origem "Catálogo" não pode ser editada nem apagada à mão; só reabrir ou cancelar o pedido a desfaz. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-06 | Na timeline, a compra do catálogo aparece uma vez, como "Compra" com o número do pedido; o evento "Pedido do catálogo" continua marcando a chegada do pedido. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-08 | Um Atendente que fecha um pedido do catálogo gera a compra normalmente, mesmo não podendo registrar compra manual. | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B30-01 | Pedidos do catálogo que já estavam Fechados antes desta mudança viram compra do contato? Se sim, com a data de fechamento registrada no histórico do pedido e sem atendente, já que não dá para saber quem fechou na época. | respondida | Sim. Viram compra com a data de fechamento do histórico do pedido e sem atendente. Marcelle, 20/10/2026 |

## Cenários

### Happy Path
1. Um pedido da loja chega vinculado a um contato (`catalog_orders.contact_id`), em Novo.
2. Uma pessoa da empresa (qualquer papel) marca o pedido como Fechado. A função do banco `mudar_situacao_pedido_catalogo`, na mesma transação do estoque, insere em `contact_purchases` uma compra com `data` = dia do fechamento (Brasília), `valor` = total do pedido, `pecas` = peças do pedido, `origem` = `catalogo`, `atendente_id` = quem fechou e `catalog_order_id` = o pedido.
3. No perfil do contato, o histórico de compras lista a compra com origem "Catálogo" e o número do pedido como link para `/catalogo/pedidos?pedido=<id>`, que abre o detalhe daquele pedido. O total e o ticket médio somam as compras manuais e as do catálogo.
4. A timeline mostra um evento "Compra registrada" com o número do pedido (na data em que fechou) e continua mostrando o "Pedido do catálogo" da chegada. Nada aparece duas vezes.
5. Voltar o pedido para Em atendimento ou cancelá-lo apaga a compra ligada ao pedido (mesma função do banco). Fechar de novo cria de novo. O índice único em `catalog_order_id` garante no máximo uma compra por pedido.
6. Ao aplicar a migration, a função `gerar_compras_de_pedidos_fechados()` roda uma vez e cria a compra dos pedidos já Fechados com contato e sem compra, com a data (e o `created_at`) do último evento `→ fechado` do histórico do pedido e sem atendente. Rodar de novo não cria nada.

### Edge Cases
- Pedido sem contato (`contact_id` nulo): fecha, baixa o estoque e não gera compra. Vincular o contato depois não gera compra (SUP-B30-03).
- Pedido fechado, reaberto e fechado de novo: só uma compra, a do último fechamento (data e atendente do último).
- Pedido já fechado antes da série cujo histórico não tem evento `→ fechado` (não deveria existir): usa a data de criação do pedido.
- Contato na lixeira: a compra é criada mesmo assim; o dashboard já ignora compras de contato na lixeira (B13-03).
- Um Atendente fecha o pedido: a compra nasce com ele como atendente, mesmo que ele não possa registrar compra manual (SUP-B30-08). A função é `security definer`, então o RLS de insert (só admin/gerente) não a barra.

### Cenário de Erro
- Alguém tenta `update` ou `delete` em uma compra com origem "Catálogo" por fora do pedido (pelo cliente autenticado ou pela chave de serviço): um gatilho `before update or delete` recusa com erro ("compra do catálogo só muda pelo pedido"). A própria função de situação libera a exclusão com `set_config('crm.pedido_catalogo', 'on', true)` na transação.
- Mudança de situação não permitida: continua recusada como hoje (`22023`), sem tocar nas compras.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B30-01 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Após fechar um pedido de R$ 350 e 7 peças com contato, o contato tem uma compra com data de hoje, valor 350, 7 peças, origem catálogo, número do pedido e atendente = quem fechou |
| CA-B30-02 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Voltar para Em atendimento (e cancelar, em outro pedido) faz a compra sumir do perfil e do faturamento do dashboard |
| CA-B30-03 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Fechar, reabrir e fechar de novo deixa exatamente uma compra ligada ao pedido |
| CA-B30-04 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Pedido sem contato fica Fechado e nenhuma compra existe para ele |
| CA-B30-21 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Pedido já Fechado sem compra: `gerar_compras_de_pedidos_fechados()` cria a compra com a data do evento de fechamento, valor, peças, origem catálogo e sem atendente; rodar de novo não cria outra |
| CA-B30-05 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | `update` e `delete` na compra do catálogo são recusados e a compra continua lá |
| CA-B30-11 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Perfil com compra manual (Pix, 3 peças) e pedido fechado lista as duas com peças, pagamento, atendente e origem, e a soma dos valores é a das duas |
| CA-B30-12 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | A compra do catálogo no perfil traz o id e o número do pedido, e abrir esse id em `carregarPedido` devolve aquele pedido |
| CA-B30-15 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | Timeline tem um evento de compra com "#<número>" e um "Pedido do catálogo"; só um evento de compra para o pedido |

## Banco de Dados

- Tabela: `contact_purchases`
  - `catalog_order_id` (uuid, nulo, FK `catalog_orders(id) on delete cascade`) — pedido que gerou a compra; índice único parcial (`where catalog_order_id is not null`); check `origem = 'catalogo'` ⇔ `catalog_order_id is not null`.
- Gatilho `compra_do_catalogo_so_pelo_pedido` (`before update or delete` em `contact_purchases`): recusa quando `old.origem = 'catalogo'` e `current_setting('crm.pedido_catalogo', true)` não é `'on'`.
- Função `mudar_situacao_pedido_catalogo(uuid, text)` recriada: ao fechar com contato, insere a compra; ao sair de Fechado, apaga a compra do pedido.
- Função `gerar_compras_de_pedidos_fechados()` (`security definer`, execução só para `service_role`): retroativo idempotente, chamada uma vez pela própria migration.

## Arquivos

- **Criar:** `supabase/migrations/20261021000002_pedido_fechado_vira_compra.sql` — coluna, índice, check, gatilho, função de situação recriada, função retroativa e a chamada dela.
- **Criar:** `src/test/pedido-fechado-vira-compra.integration.test.ts` — testes da tabela Prova.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado (`npx supabase gen types typescript --linked`).
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — `Compra` ganha `pedidoId` e `pedidoNumero`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `buscarDadosContato` seleciona o pedido da compra (`catalog_order_id`, `catalog_orders(number)`), mapeia `pedidoId`/`pedidoNumero` e põe o número do pedido no evento de compra da timeline.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — na coluna Origem, compra do catálogo mostra "Catálogo · #número" como link para `/catalogo/pedidos?pedido=<id>` (mesmo destino de `SecaoPedidosContato`).

## Checklist

- [x] Migration escrita e aplicada com `npx supabase db push --linked`; tipos regenerados
- [x] Fechar pedido com contato cria a compra; sair de Fechado apaga; sem contato não cria
- [x] Retroativo rodou uma vez na migration e é idempotente
- [x] Gatilho recusa update/delete de compra do catálogo por fora do pedido
- [x] Perfil: compra do catálogo com número do pedido como link; timeline com o número e sem duplicar
- [x] Testes da tabela Prova escritos e passando
- [x] `npm run build` e `npx eslint src --quiet` limpos
