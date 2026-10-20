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
