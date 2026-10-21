# B31-01: Faixas de preço e mínimo por produto

**Tipo:** Implementação
**Página:** Editor de produto (`/catalogo`), vitrine e carrinho (`/loja/[endereco]`), registro do pedido (servidor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

O produto ganha até 3 faixas de preço ("a partir de N peças, R$ X") e um mínimo de peças
por pedido, ambos opcionais, cadastrados no editor do produto. A vitrine mostra as
regras no cartão e na página, o carrinho aplica o preço da faixa alcançada (somando
cores e tamanhos do mesmo produto) e avisa o que falta para a próxima faixa e para o
mínimo. O servidor grava o unitário da faixa, confere o mínimo por produto e recusa
preço do navegador que não bate (como no QA A9). Produto sem regra continua como na B16.

## Pronto quando

Na empresa de teste, a camiseta de R$ 29,90 recebe a faixa "a partir de 12: R$ 24,90" e
mínimo 6. Na loja, o cartão e a página mostram as duas regras; escolher 4 peças avisa o
mínimo e não adiciona; com 8 no carrinho o unitário é R$ 29,90 e aparece "faltam 4 peças
para R$ 24,90"; com 12 cai para R$ 24,90 em todas as linhas. O pedido registrado traz
R$ 24,90 na mensagem do WhatsApp; um pedido forçado com 4 peças é recusado pelo servidor.

## Critérios de aceite

- **CA-B31-01** (automática) — Faixas de preço salvas e conferidas. Dado um produto com preço R$ 29,90, quando o lojista salva as faixas "a partir de 12: R$ 24,90" e "a partir de 48: R$ 21,90", então o produto fica com as duas faixas, e salvar "a partir de 12: R$ 31,00" (acima do preço base) ou "a partir de 48: R$ 25,00" depois de "a partir de 12: R$ 24,90" (preço que não desce) é recusado com aviso.
- **CA-B31-02** (automática) — Mínimo por produto salvo. Dado um produto sem mínimo, quando o lojista salva mínimo 6, então o produto fica com mínimo 6; salvar 0 ou texto é recusado; limpar o campo volta a "sem mínimo".
- **CA-B31-05** (automática) — Preço da faixa aplicado no carrinho. Dado o produto com faixa "a partir de 12: R$ 24,90", quando o carrinho tem 8 peças dele (4 azuis e 4 pretas) e a cliente sobe para 12, então o unitário mostrado passa de R$ 29,90 para R$ 24,90 em todas as linhas do produto, e com 8 o carrinho avisa "faltam 4 peças para R$ 24,90".
- **CA-B31-06** (automática) — Mínimo por produto avisado na vitrine. Dado o produto com mínimo 6, quando a cliente escolhe 4 peças na página do produto, então o botão avisa "mínimo 6 peças" e não adiciona; com 6 ou mais adiciona; se o carrinho ficar com 4 (depois de diminuir), a linha avisa e "Fazer pedido" não segue.
- **CA-B31-10** (automática) — Pedido gravado com o preço da faixa. Dado o produto com faixa "a partir de 12: R$ 24,90", quando a loja registra um pedido com 12 peças dele, então os itens ficam com unitário R$ 24,90, a mensagem traz R$ 24,90 e o total de R$ 298,80; com 11 peças fica R$ 29,90.
- **CA-B31-11** (automática) — Preço enviado pelo navegador não vale. Dado o mesmo produto, quando o navegador manda 12 peças dizendo que viu R$ 24,90, mas o lojista tirou a faixa antes de o pedido chegar, então o pedido não sai, avisa que o preço mudou e devolve R$ 29,90 (como no QA A9).
- **CA-B31-12** (automática) — Mínimo por produto conferido no servidor. Dado o produto com mínimo 6, quando chega um pedido com 4 peças dele, ainda que o mínimo da loja esteja batido, então o pedido é recusado dizendo "Camiseta: mínimo 6 peças".
- **CA-B31-14** (automática) — Regras não valem para quem não as tem. Dado uma loja com produtos sem nenhuma regra, quando chega um pedido como hoje, então tudo segue igual à B16: preço base, qualquer quantidade, só o mínimo da loja.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-01 | A faixa de preço do produto conta as peças do mesmo produto somando todas as combinações (cores e tamanhos). | confirmada | Marcelle, 21/10/2026: é uma das duas formas; a outra é o desconto por total do pedido (CA-B31-16) |
| SUP-B31-02 | O mínimo por produto é em peças, somando todas as combinações. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-09 | Na página do produto, o mínimo e a faixa contam as peças escolhidas mais as que já estão no carrinho do mesmo produto (adicionar 2 quando já há 6 no carrinho passa). | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | respondida | Marcelle, 21/10/2026: regra do negócio de cada atacadista; o sistema oferece as duas e o lojista escolhe |

## Cenários

### Happy Path
1. No editor do produto, abaixo do preço, o lojista preenche até 3 faixas ("a partir de 12 peças, R$ 24,90") e o mínimo de peças por pedido (6). Salvar confere no servidor (`salvarProduto`) e grava `price_tiers` e `min_quantity` em `catalog_products`.
2. A loja pública lê as duas regras (`carregarVitrine`, `carregarProdutoPublico`). O cartão e a página mostram "A partir de 12: R$ 24,90 · mínimo 6 peças".
3. Na página do produto, o botão "Adicionar" soma as peças escolhidas com as que já estão no carrinho do mesmo produto; abaixo do mínimo, avisa "Mínimo 6 peças" e não adiciona. O preço do botão já usa a faixa alcançada.
4. No carrinho, cada linha do produto mostra o unitário da faixa alcançada pela soma das peças do produto (cores e tamanhos juntas). Abaixo da próxima faixa, a primeira linha do produto avisa "Faltam 4 peças para R$ 24,90". Mudar a quantidade recalcula na hora.
5. Ao fazer o pedido, o navegador manda o unitário que mostrou; o servidor (`registrarPedido`) recalcula a faixa pela soma das peças do produto, grava esse unitário em cada item (a função do banco soma o total a partir dele) e põe "(preço de 12+)" na linha da mensagem.

### Edge Cases
- Produto sem faixa nem mínimo: tudo igual à B16 (preço base, qualquer quantidade, só o mínimo da loja).
- Carrinho antigo no aparelho (sem `faixas`/`minimo` guardados): trata como produto sem regra até o servidor devolver as regras de hoje.
- O lojista tirou a faixa com o carrinho aberto: o servidor recusa com "O preço mudou" e devolve o preço base e as faixas de hoje; o carrinho atualiza os dois e a cliente confirma de novo (QA A9).
- Mínimo do produto maior que o estoque disponível: a página avisa o mínimo e a cliente não consegue adicionar (regra do lojista; o estoque limita a grade).
- Faixa com a mesma quantidade do mínimo (mínimo 12 e faixa a partir de 12): o primeiro pedido válido já sai no preço da faixa.

### Cenário de Erro
- Editor: faixa com quantidade menor que 2, preço maior ou igual ao preço base, quantidades que não crescem ou preços que não descem → "Faixa N: ..." e nada é gravado. Mínimo 0, negativo ou texto → "Mínimo por produto: use um número inteiro a partir de 1."
- Pedido com produto abaixo do mínimo → "Camiseta: mínimo 6 peças" (nome do produto), mesmo com o mínimo da loja batido.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B31-01 | automática | `src/test/catalogo-produtos.integration.test.ts` | salva duas faixas e devolve iguais; faixa acima do preço base e preço que não desce são recusados com aviso |
| CA-B31-02 | automática | `src/test/catalogo-produtos.integration.test.ts` | salva mínimo 6; 0 e texto recusados; `null` volta a sem mínimo |
| CA-B31-05 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | o carrinho com 8 peças (4 + 4) mostra R$ 29,90 e "Faltam 4 peças para R$ 24,90"; com 12 mostra R$ 24,90 nas duas linhas |
| CA-B31-06 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | página do produto com 4 peças escolhidas mostra "Mínimo 6 peças" e não chama `onAdicionar`; com 6 chama; carrinho com 4 marca a linha e "Fazer pedido" não chama `onFazerPedido` |
| CA-B31-10 | automática | `src/test/catalogo-pedido.integration.test.ts` | pedido com 12 peças grava unitário 24,90, total 298,80 e mensagem com R$ 24,90; com 11 fica 29,90 |
| CA-B31-11 | automática | `src/test/catalogo-pedido.integration.test.ts` | faixa removida: pedido com preço 24,90 enviado não sai, erro "O preço mudou" e `precosNovos` com 29,90 |
| CA-B31-12 | automática | `src/test/catalogo-pedido.integration.test.ts` | pedido com 4 peças de produto com mínimo 6 é recusado com "mínimo 6 peças", com o mínimo da loja batido |
| CA-B31-14 | automática | `src/test/catalogo-pedido.integration.test.ts` | produto sem regra: pedido sai com o preço base e qualquer quantidade (os testes da B16-09 continuam passando) |

## Banco de Dados

- Tabela: `catalog_products`
  - `price_tiers` (jsonb, padrão `[]`) — faixas `[{ "min": 12, "price": 24.90 }]`, no máximo 3, em ordem crescente de `min`
  - `min_quantity` (int, nulo) — mínimo de peças do produto por pedido; nulo = sem mínimo
- Migration: `supabase/migrations/20261021000003_regras_de_venda_do_produto.sql` (só colunas novas com padrão: pode ir antes do deploy)

## Arquivos

- **Criar:** `supabase/migrations/20261021000003_regras_de_venda_do_produto.sql` — as duas colunas
- **Criar:** `src/lib/catalogo/regras-de-venda.ts` — funções puras: validar faixas e mínimo, preço por quantidade, próxima faixa, aviso de mínimo (usadas pelo editor, pela vitrine e pelo servidor)
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado (`supabase gen types`)
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — `faixas` e `minimo` em `ProdutoEditavel`; seção "Regras de venda"
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/page.tsx` — produto novo nasce sem faixas e sem mínimo
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — `carregarProduto` devolve e `salvarProduto` confere e grava as regras
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `faixas` e `minimo` em `ProdutoVitrine` e `ProdutoDetalhe`
- **Modificar:** `src/app/loja/components/vitrine.tsx` — linha das regras no cartão
- **Modificar:** `src/app/loja/components/pagina-produto.tsx` — regras na página, preço do botão pela faixa, aviso do mínimo ao adicionar
- **Modificar:** `src/app/loja/components/carrinho-local.ts` — `faixas` e `minimo` no item guardado; `ajustarPrecos` atualiza também as faixas
- **Modificar:** `src/app/loja/components/carrinho.tsx` — unitário pela faixa, aviso da próxima faixa, linha abaixo do mínimo trava o pedido
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — manda ao servidor o unitário da faixa; recebe faixas novas
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx` — passa `faixas`, `minimo` e o que já está no carrinho
- **Modificar:** `src/app/loja/components/pedido.ts` — `faixaAplicada` na linha da mensagem ("preço de 12+")
- **Modificar:** `src/lib/catalogo/pedidos.ts` — unitário pela faixa, mínimo por produto, `precosNovos` com faixas
- **Modificar:** `src/test/catalogo-produtos.integration.test.ts` — CA-B31-01, CA-B31-02
- **Modificar:** `src/test/catalogo-loja-publica.integration.test.ts` — o produto de teste ganha os campos novos (só o tipo)
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — CA-B31-10, 11, 12, 14
- **Criar:** `src/test/catalogo-carrinho-regras.test.tsx` — CA-B31-05, CA-B31-06

## Checklist

- [x] Migration criada e aplicada (`npx supabase db push --linked`); tipos regenerados
- [x] Funções puras de regras de venda
- [x] Editor: seção "Regras de venda" (faixas e mínimo) e ação de salvar conferindo no servidor
- [x] Loja pública devolve as regras; cartão e página mostram
- [x] Página do produto: preço pela faixa e aviso do mínimo ao adicionar
- [x] Carrinho: unitário pela faixa, aviso da próxima faixa, mínimo trava o pedido
- [x] Servidor: unitário pela faixa, conferência do preço enviado, mínimo por produto, mensagem com "preço de 12+"
- [x] Testes da tabela Prova passando
