# B53-12: Grade fechada cobrada pelo preço do pacote

**Tipo:** Implementação
**Página:** Loja
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O total do pedido com grade fechada passa a sair do preço do pacote, sem a soma dos preços por peça arredondados.

## Pronto quando

Uma grade de R$ 140 sai R$ 140,00 na loja e no pedido do CRM.

## Critérios de aceite

- **CA-B53-25** (automática) — Grade de R$ 140 é cobrada R$ 140. Dado uma grade fechada de 6 peças por R$ 140, quando a cliente pede 1 e 2 grades, então o total do pedido gravado é R$ 140,00 e R$ 280,00, na loja e no pedido do CRM.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O produto tem grade fechada P 1 · M 2 · G 2 · GG 1 (6 peças) com preço próprio de R$ 140.
2. A cliente põe 1 grade no carrinho: o bloco e o total mostram R$ 140,00 (antes: 6 × 23,33 = R$ 139,98).
3. Ela envia: o servidor monta os itens com o unitário da grade sem arredondar (140 ÷ 6), soma o pedido e arredonda só o total; a função `registrar_pedido_catalogo` soma quantidade × unitário em `numeric(12,2)`, o que dá R$ 140,00. Cada item fica gravado com R$ 23,33 (a coluna arredonda).
4. A mensagem traz "1 grade (6 peças) — R$ 23,33 cada = R$ 140,00" e "Total: 6 peças · R$ 140,00".
5. Com 2 grades, R$ 280,00 em todos os lugares.

### Edge Cases
- Grade sem preço próprio: o unitário é o normal (centavos exatos); nada muda.
- Grade com preço que divide exato (R$ 150 em 6 = R$ 25): nada muda (CA-B31-15 segue passando).
- Desconto por total do pedido (B31-02): sai sobre o subtotal já arredondado em centavos, igual na loja, no servidor e na função SQL.
- Conferência de "o preço mudou" (QA A9): o carrinho e o servidor usam a mesma função sem arredondar, então a diferença é zero.

### Cenário de Erro
Nenhum novo: as recusas de grade quebrada, estoque e preço mudado ficam como estão.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-25 | automática | `src/test/catalogo-pedido.integration.test.ts` | com grade de 6 peças por R$ 140, o pedido gravado no banco (o do CRM) tem total 140 com 1 grade e 280 com 2, e a mensagem traz R$ 140,00 e R$ 280,00 |
| CA-B53-25 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | o carrinho da loja com 1 e com 2 grades de R$ 140 mostra o total R$ 140,00 e R$ 280,00 |

## Banco de Dados

Sem migration. A função `registrar_pedido_catalogo` já soma `quantity × unit_price` em `v_subtotal numeric(12,2)`, que arredonda o total em centavos; basta o servidor mandar o unitário da grade sem arredondar.

## Arquivos

- **Modificar:** `src/lib/catalogo/regras-de-venda.ts` — `unitarioDaGrade` devolve preço ÷ peças sem arredondar (a tela arredonda ao mostrar).
- **Modificar:** `src/app/loja/components/pedido.ts` — `totaisDoPedido` arredonda o valor total em centavos.
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — teste do CA-B53-25 no pedido gravado.
- **Modificar:** `src/test/catalogo-carrinho-regras.test.tsx` — teste do CA-B53-25 no carrinho da loja.

## Checklist

- [x] `unitarioDaGrade` sem arredondar
- [x] `totaisDoPedido` com o total arredondado em centavos
- [x] Testes do CA-B53-25 (pedido gravado e carrinho)
- [x] Rodar os testes do catálogo (pedido, carrinho, repetir pedido) e o tsc
