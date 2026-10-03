# B16-11: Estoque baixa ao fechar o pedido e volta ao cancelar

**Tipo:** Implementação
**Página:** Pedidos, Produtos, Vitrine pública
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — "Decisões" (estoque) e os comportamentos "Marcar como Fechado" e "Cancelar um pedido Fechado"
**Depende de:** B16-10

## Descrição

Marcar o pedido como Fechado baixa o estoque das combinações; com estoque insuficiente,
avisa quais e pede confirmação (vai a zero, nunca negativo); cancelar um pedido Fechado
devolve o estoque.

## Pronto quando

Em produção, fechar um pedido de 3 peças M/Azul tira 3 do estoque dessa combinação (a
vitrine passa a mostrar indisponível se zerar), e cancelar o mesmo pedido devolve as 3.
