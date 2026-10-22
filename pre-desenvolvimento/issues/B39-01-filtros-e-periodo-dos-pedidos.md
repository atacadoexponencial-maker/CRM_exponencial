# B39-01: Filtros novos e período personalizado na tela Pedidos

**Tipo:** Implementação
**Página:** Pedidos (`/catalogo/pedidos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-pedidos-exportar-e-filtrar.md`

## Descrição

Acrescentar à tela Pedidos os filtros de valor, produto (inclusive apagado), cliente nova ou antiga e atendente da cliente, e o período Personalizado com calendário, todos aplicados no servidor sobre todos os pedidos da empresa.

## Pronto quando

Na tela Pedidos, a pessoa combina busca, situação, período (atalhos ou de/até no calendário), valor mínimo e máximo, produto, cliente nova ou antiga e atendente da cliente; a lista e a contagem "N pedidos" valem para todos os pedidos da empresa, e "Limpar filtros" volta ao padrão.

## Critérios de aceite

- **CA-B39-01** (automática) — Período personalizado pelo calendário. Dado pedidos feitos em 01/10, 10/10 e 20/10, quando a pessoa escolhe "Personalizado" e marca de 05/10 até 15/10, então só aparece o pedido de 10/10; os dias de início e fim contam inteiros, no horário de Brasília.
- **CA-B39-02** (automática) — Dia final antes do inicial é recusado. Dado o período Personalizado aberto, quando a pessoa marca o dia final antes do dia inicial, então a tela avisa "O dia final precisa ser depois do inicial" e a lista não muda.
- **CA-B39-03** (automática) — Os atalhos de período continuam. Dado pedidos de hoje, de 5 dias atrás e de 20 dias atrás, quando a pessoa escolhe "Hoje", depois "Últimos 7 dias", então aparece só o de hoje, e depois o de hoje e o de 5 dias atrás.
- **CA-B39-04** (automática) — Filtrar pelo valor do pedido. Dado pedidos de R$ 300, R$ 800 e R$ 1.500, quando a pessoa informa mínimo R$ 500, depois máximo R$ 1.000 junto, então aparecem primeiro os de R$ 800 e R$ 1.500, e depois só o de R$ 800 (o valor é o que a cliente paga, já com desconto).
- **CA-B39-05** (automática) — Filtrar pelo produto no pedido. Dado um pedido com a "Blusa Lisa" e outro sem ela, quando a pessoa escolhe o produto "Blusa Lisa", então só aparece o pedido que tem a Blusa Lisa.
- **CA-B39-19** (automática) — Produto apagado do catálogo continua no filtro. Dado um pedido antigo com a "Saia Antiga", produto que já foi apagado do catálogo, quando a pessoa abre a escolha de produto e escolhe "Saia Antiga", então o produto aparece na lista (marcado como apagado) e o pedido antigo aparece no resultado.
- **CA-B39-06** (automática) — Filtrar cliente nova ou antiga. Dado uma cliente que já tinha compra antes do pedido e outra que nunca tinha comprado, quando a pessoa escolhe "Nova", depois "Antiga", então "Nova" mostra só o pedido da que nunca tinha comprado; "Antiga", só o da que já tinha.
- **CA-B39-07** (automática) — Filtrar pelo atendente da cliente. Dado uma cliente da carteira da Ana, outra da carteira do Bruno e outra sem atendente, quando a pessoa escolhe "Ana", depois "Sem atendente", então aparece só o pedido da cliente da Ana, e depois só o da cliente sem atendente.
- **CA-B39-08** (automática) — Os filtros valem juntos. Dado pedidos variados, quando a pessoa combina situação "Fechado", mínimo R$ 500 e cliente "Nova", então só aparecem os pedidos fechados, de R$ 500 ou mais, de clientes novas.
- **CA-B39-09** (automática) — Os filtros olham todos os pedidos. Dado uma empresa com mais de 500 pedidos, e o pedido procurado é o mais antigo, quando a pessoa filtra por um valor que só ele tem, então ele aparece, e a contagem mostra "1 pedido".
- **CA-B39-10** (automática) — Limpar filtros volta ao padrão. Dado vários filtros ligados, quando a pessoa clica em "Limpar filtros", então todos voltam ao padrão (situação Todas, período Últimos 30 dias, campos vazios) e a lista mostra os pedidos desse padrão.
- **CA-B39-11** (manual) — Filtros cabem no celular. Dado a tela Pedidos aberta no celular, quando a pessoa abre o período Personalizado e preenche os filtros novos, então tudo cabe sem rolar para o lado, o calendário abre e fecha bem, e o visual segue o estilo Caderno.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B39-01 | O padrão da tela continua "Últimos 30 dias" e situação "Todas", como hoje. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-02 | "Atendente da cliente" é o atendente do contato da cliente (a carteira da série B35), não quem mexeu no pedido. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-03 | O produto do filtro é escolhido entre os produtos que existem hoje no catálogo; pedido de produto já apagado do catálogo não aparece nesse filtro. | invalidada | A lista do filtro também traz os produtos apagados que aparecem em pedidos antigos (CA-B39-19). Marcelle, 22/10/2026. |
| SUP-B39-04 | Pedido sem contato ligado (cliente que ainda não virou contato) conta como cliente nova e como "Sem atendente". | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B39-01 | Quais filtros novos entram? | respondida | Valor do pedido, produto no pedido, cliente nova ou antiga e atendente da cliente. Marcelle, 22/10/2026. |
| PER-B39-05 | O que é "cliente nova"? | respondida | Antes deste pedido ela não tinha nenhum pedido fechado nem compra registrada; "antiga" já tinha. Marcelle, 22/10/2026. |
| PER-B39-06 | Como fica o período? | respondida | Continuam os atalhos (Hoje, 7 dias, 30 dias, Tudo) e entra "Personalizado" com calendário de/até. Marcelle, 22/10/2026. |
