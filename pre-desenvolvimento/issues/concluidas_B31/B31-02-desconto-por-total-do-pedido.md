# B31-02: Desconto por total do pedido

**Tipo:** Implementação
**Página:** Configurações do catálogo (`/catalogo/configuracoes`), vitrine e carrinho (`/loja/[endereco]`), registro do pedido (servidor), compra do contato (B30)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

A loja ganha até 3 linhas de desconto por total de peças do pedido ("a partir de 50
peças no pedido, 10% a menos"), nas configurações do catálogo, abaixo do pedido mínimo.
A vitrine avisa a regra no topo, o carrinho mostra subtotal, linha de desconto e total
(e o que falta para a próxima linha), e o servidor grava o desconto no pedido e na
compra do contato gerada pela B30. O desconto entra sobre o total depois do preço por
faixa de cada produto (B31-01).

Depende da B31-01 (preço da faixa por item).

## Pronto quando

Na empresa de teste, a loja recebe "a partir de 50 peças, 10%". A vitrine mostra "10% a
menos a partir de 50 peças" ao lado do pedido mínimo. Com 49 peças no carrinho aparece
"falta 1 peça para 10% de desconto"; com 50 o carrinho mostra o subtotal, "− R$ 124,50"
e o total R$ 1.120,50. O pedido registrado traz as três linhas na mensagem do WhatsApp
e, fechado no CRM, a compra do contato nasce com esse desconto.

## Critérios de aceite

- **CA-B31-16** (automática) — Desconto por total do pedido salvo e conferido. Dado a loja sem desconto por pedido, quando o lojista salva "a partir de 50 peças, 10%" e "a partir de 100 peças, 15%", então a loja fica com as duas linhas; "a partir de 100, 5%" depois de "50, 10%" (porcentagem que não sobe) ou 0% ou 95% são recusados com aviso.
- **CA-B31-17** (automática) — Desconto do pedido aplicado no carrinho e no servidor. Dado a loja com "a partir de 50 peças, 10%" e um produto a R$ 29,90 com faixa "a partir de 12: R$ 24,90", quando o carrinho tem 50 peças desse produto, então o carrinho mostra 50 × R$ 24,90 = R$ 1.245,00, "desconto de 10% do pedido: − R$ 124,50" e total R$ 1.120,50; o pedido registrado guarda o desconto e a compra do contato (B30) recebe esse desconto; com 49 peças não há desconto e o carrinho avisa "falta 1 peça para 10% de desconto".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-08 | Quando a loja tem desconto por pedido e o produto tem faixa, os dois valem: a faixa dá o unitário e o desconto da loja entra sobre o total. | confirmada | Marcelle, 21/10/2026: avisada antes do /break ("se preferir que um exclua o outro, me diga") e mandou seguir |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | respondida | Marcelle, 21/10/2026: regra do negócio de cada atacadista; o sistema oferece as duas e o lojista escolhe |

## Cenários

### Happy Path
1. Em Configurações do catálogo, abaixo do pedido mínimo, o lojista preenche até 3 linhas "a partir de N peças no pedido, X% a menos". Salvar confere no servidor e grava `order_discounts` em `catalog_settings`.
2. A loja pública lê as linhas (`carregarLojaPublica`). A vitrine mostra, ao lado do pedido mínimo, "10% a menos a partir de 50 peças".
3. No carrinho, o subtotal soma as linhas já com o preço da faixa de cada produto (B31-01). Alcançada uma linha de desconto pelo total de peças do carrinho, aparece "Desconto de 10% do pedido: − R$ 124,50" e o total com o desconto. Abaixo da próxima linha, o carrinho avisa "Falta 1 peça para 10% de desconto".
4. Ao fazer o pedido, o servidor recalcula o desconto pelas linhas de hoje e pelo total de peças, e grava no pedido a porcentagem e o valor em reais (`discount_percent`, `discount`); `total` passa a ser o valor com o desconto (o que a cliente paga). A mensagem do WhatsApp traz subtotal, desconto e total.
5. Quando o pedido é marcado como Fechado no CRM, a compra do contato (B30-02) nasce com `valor` = total com desconto e `desconto` = o valor em reais.
6. O detalhe do pedido no CRM mostra a linha do desconto abaixo dos itens.

### Edge Cases
- Loja sem desconto por pedido: carrinho, mensagem e pedido ficam como eram (desconto zero, sem linha).
- Desconto e faixa de preço no mesmo carrinho: a faixa dá o unitário, o desconto da loja entra sobre o subtotal (SUP-B31-08).
- O lojista mudou as linhas de desconto com o carrinho aberto: o servidor usa as linhas de hoje; o total pode ser diferente do que a cliente viu, mas a mensagem mostra o que valeu. A conferência de "preço mudou" (QA A9) continua olhando o unitário por item.
- Arredondamento: o desconto em reais é arredondado em centavos; o total é subtotal menos desconto.

### Cenário de Erro
- Configurações: quantidade menor que 2, porcentagem fora de 1 a 90, quantidades que não crescem ou porcentagens que não sobem → "Desconto N: ..." e nada é gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B31-16 | automática | `src/test/catalogo-loja-publica.integration.test.ts` | salva duas linhas e a loja pública devolve iguais; porcentagem que não sobe, 0% e 95% são recusados com aviso |
| CA-B31-17 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | carrinho com 50 peças a R$ 24,90 mostra subtotal R$ 1.245,00, "Desconto de 10% do pedido: − R$ 124,50" e total R$ 1.120,50; com 49 avisa "Falta 1 peça para 10% de desconto" |
| CA-B31-17 | automática | `src/test/catalogo-pedido.integration.test.ts` | pedido com 50 peças grava desconto 124,50 e total 1.120,50; mensagem com as três linhas; com 49 sem desconto |
| CA-B31-17 | automática | `src/test/pedido-fechado-vira-compra.integration.test.ts` | pedido com desconto fechado no CRM gera compra com valor = total com desconto e `desconto` = 124,50 |

## Banco de Dados

- Tabela: `catalog_settings`
  - `order_discounts` (jsonb, padrão `[]`) — linhas `[{ "min": 50, "percent": 10 }]`, no máximo 3, em ordem crescente
- Tabela: `catalog_orders`
  - `discount_percent` (numeric(5,2), padrão 0) — porcentagem que valeu
  - `discount` (numeric(12,2), padrão 0) — desconto em reais; `total` passa a ser o valor com o desconto
- Função `registrar_pedido_catalogo` ganha `p_desconto_percent` e calcula subtotal, desconto e total
- Função `mudar_situacao_pedido_catalogo` grava `desconto` na compra do contato
- Migration: `supabase/migrations/20261021000004_desconto_por_total_do_pedido.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261021000004_desconto_por_total_do_pedido.sql` — colunas e as duas funções
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado
- **Modificar:** `src/lib/catalogo/regras-de-venda.ts` — `DescontoPedido`, `validarDescontos`, `descontoAlcancado`, `avisoProximoDesconto`, `aplicarDesconto`, `resumoDoDesconto`
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — `descontos` em `ConfigCatalogo`; seção "Desconto por total do pedido"
- **Modificar:** `src/app/(auth)/catalogo/configuracoes/actions.ts` — carrega, confere e grava `order_discounts`
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `descontos` em `LojaPublica`
- **Modificar:** `src/app/loja/[endereco]/page.tsx` — passa os descontos da loja ao cliente
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx` — passa os descontos à vitrine e ao carrinho
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/page.tsx` — passa os descontos da loja ao cliente
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx` — passa os descontos ao carrinho
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — recebe os descontos e passa ao carrinho
- **Modificar:** `src/app/loja/components/vitrine.tsx` — aviso do desconto ao lado do pedido mínimo
- **Modificar:** `src/app/loja/components/carrinho.tsx` — subtotal, linha do desconto, total e aviso do que falta
- **Modificar:** `src/app/loja/components/pedido.ts` — `totaisComDesconto` e a mensagem com subtotal, desconto e total
- **Modificar:** `src/lib/catalogo/pedidos.ts` — calcula o desconto e manda `p_desconto_percent`
- **Modificar:** `src/app/(auth)/catalogo/pedidos/actions.ts` — lê `discount` e `discount_percent`
- **Modificar:** `src/app/(auth)/catalogo/components/lista-pedidos.tsx` — `desconto` em `PedidoResumo`
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — linha do desconto no detalhe
- **Modificar:** `src/test/catalogo-loja-publica.integration.test.ts` — CA-B31-16
- **Modificar:** `src/test/catalogo-carrinho-regras.test.tsx` — CA-B31-17 (carrinho)
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — CA-B31-17 (servidor)
- **Modificar:** `src/test/pedido-fechado-vira-compra.integration.test.ts` — CA-B31-17 (compra do contato)

## Checklist

- [x] Migration criada e aplicada; tipos regenerados
- [x] Funções puras do desconto por pedido
- [x] Configurações: seção e ação de salvar conferindo no servidor
- [x] Vitrine avisa o desconto; carrinho mostra subtotal, desconto, total e o que falta
- [x] Servidor grava o desconto; mensagem com as três linhas; compra do contato com o desconto
- [x] Detalhe do pedido no CRM mostra o desconto
- [x] Testes da tabela Prova passando
