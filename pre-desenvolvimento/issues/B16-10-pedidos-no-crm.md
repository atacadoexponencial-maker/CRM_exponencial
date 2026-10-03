# B16-10: Pedidos no CRM e no perfil do contato

**Tipo:** Implementação
**Página:** Pedidos (`/catalogo/pedidos`), Perfil do contato, Menu do CRM
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Pedidos" (menos a baixa de estoque) e "Perfil do contato"
**Depende de:** B16-09 e B16-04 aprovado

## Descrição

Lista de pedidos com filtros e busca, detalhe com itens e histórico de situação, troca
manual de situação, links para o perfil e a conversa, contador de Novos no menu, e a seção
"Pedidos do catálogo" com o evento na linha do tempo do contato. Todos os papéis.

## Pronto quando

Em produção, o pedido feito pela vitrine aparece na lista e no contador de Novos; um
Atendente abre o detalhe, muda para Em atendimento, e o pedido aparece no perfil do
contato com o evento na linha do tempo.
