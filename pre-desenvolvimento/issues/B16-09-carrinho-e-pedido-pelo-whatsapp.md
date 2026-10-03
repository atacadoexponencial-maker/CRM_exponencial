# B16-09: Carrinho e pedido pelo WhatsApp

**Tipo:** Implementação
**Página:** Carrinho e pedido (vitrine pública)
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seção "Carrinho e pedido" e "Decisões" (pedido no CRM, cliente do pedido)
**Depende de:** B16-07

## Descrição

Carrinho guardado no aparelho da cliente, com quantidade limitada ao estoque, total e
barra do pedido mínimo; nome e WhatsApp obrigatórios; ao Fazer pedido, o servidor confere
estoque e mínimo, registra o pedido (situação Novo) ligado ao contato (cria se não existe,
sem card nem funil) e abre o WhatsApp da loja com a mensagem pronta; pedidos repetidos em
sequência do mesmo número são barrados.

## Pronto quando

Em produção, a Marcelle monta um carrinho num celular, vê o mínimo bloquear e liberar o
botão, faz o pedido, o WhatsApp abre no número da loja com número do pedido, itens e
total, e o pedido aparece gravado ligado ao contato.
