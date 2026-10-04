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

## Cenários

### Happy Path
1. Marcar o pedido como **Fechado** baixa, no banco e na mesma transação da mudança de
   situação, o estoque de cada combinação do pedido.
2. **Cancelar um pedido Fechado** devolve ao estoque o que tinha sido baixado.
3. A vitrine passa a mostrar a combinação indisponível quando o estoque zera.

### Edge Cases
- **Estoque insuficiente**: o detalhe já avisa e pede confirmação (B16-10); ao fechar, a
  combinação vai a **zero** (nunca negativo).
- **Devolve só o que saiu**: cada item guarda quanto foi realmente baixado
  (`estoque_baixado`); se o estoque tinha 2 e o pedido pedia 3, fechar baixa 2 e cancelar
  devolve 2.
- Produto excluído ou combinação que saiu da grade depois do pedido: o item não mexe em
  estoque (não há linha para baixar ou devolver).
- Cancelar um pedido que **não** estava Fechado: nada no estoque.
- Dois pedidos fechados ao mesmo tempo: as linhas de estoque são travadas na transação,
  então o estoque não "volta" por corrida.

### Cenário de Erro
- Falha no meio: nada muda (situação e estoque na mesma transação).

## Banco de Dados

- `catalog_order_items.estoque_baixado` (int, padrão 0)
- Função `mudar_situacao_pedido_catalogo` passa a baixar/devolver o estoque
- Migration: `supabase/migrations/20261003000012_catalogo_estoque_do_pedido.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261003000012_catalogo_estoque_do_pedido.sql`
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — texto do estoque depois de fechado/cancelado
- **Modificar:** `src/test/catalogo-pedidos-crm.integration.test.ts` — casos da B16-11

## Checklist

- [x] Migration aplicada
- [x] Fechar baixa (até zero), cancelar fechado devolve o que saiu
- [x] Testes de integração (9/9 em `catalogo-pedidos-crm.integration.test.ts`, 3 novos; os 43 do catálogo juntos passam; suíte completa: as falhas foram só limite de requisições — os 11 arquivos passam isolados)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência (fechar, vitrine indisponível, cancelar devolve) (03/10: pedido não mexe no estoque; fechar 3 de 3 deixa M indisponível na vitrine e P disponível; cancelar devolve 3)
- [x] Commit + push (`bbc95b6`); deploy Ready (03/10)
