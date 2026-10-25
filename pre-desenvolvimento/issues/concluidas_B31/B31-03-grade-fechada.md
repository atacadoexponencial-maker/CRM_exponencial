# B31-03: Grade fechada

**Tipo:** Implementação
**Página:** Editor de produto (`/catalogo`), página do produto e carrinho (`/loja/[endereco]`), registro do pedido (servidor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

Produto com variação pode ser vendido só em grade fechada: o lojista liga o interruptor,
dá uma quantidade por opção do primeiro tipo (ex.: P 1, M 2, G 2, GG 1) e, se quiser, um
preço próprio da grade (vazio = soma das peças). Na loja, a página do produto troca a
grade de quantidades livre por um contador de pacotes por bloco (cor); cada pacote vira
as linhas da grade no carrinho, mostradas como "2 grades · 12 peças". O servidor recusa
pedido cujas quantidades não são múltiplos exatos da grade por bloco e põe "2 grades
(12 peças)" na mensagem. Com as três regras no ar, a Marcelle confere no celular o aviso
de cada uma no cartão e na página.

Depende da B31-01 (o preço da faixa e o mínimo já existem no editor e no carrinho).

## Pronto quando

Na empresa de teste, a camiseta (P, M, G, GG × Azul, Preto) fica com grade P 1, M 2, G 2,
GG 1. Na loja, a página mostra a grade e um contador por cor; pedir 2 de Azul e 1 de
Preto põe no carrinho "2 grades · 12 peças" e "1 grade · 6 peças", por R$ 179,40 a grade
ou pelo preço próprio quando preenchido. Preto sem estoque para um pacote inteiro
aparece indisponível. Um pedido forçado com G 3 em Azul é recusado pelo servidor.

## Critérios de aceite

- **CA-B31-03** (automática) — Grade fechada salva. Dado um produto com Tamanho (P, M, G, GG) e Cor (Azul, Preto), quando o lojista liga a grade fechada com P 1, M 2, G 2, GG 1, então o produto fica com a grade de 6 peças; produto sem variação não aceita grade fechada; grade com todas as quantidades zero é recusada.
- **CA-B31-15** (automática) — Preço próprio da grade. Dado o produto com grade de 6 peças a R$ 29,90 cada, quando o lojista preenche "preço da grade" R$ 150,00, então a página do produto, o carrinho e a mensagem do pedido mostram a grade por R$ 150,00 (R$ 25,00 a peça); com o campo vazio, R$ 179,40; preço zero ou negativo é recusado.
- **CA-B31-07** (automática) — Grade fechada na página do produto. Dado o produto com grade P 1, M 2, G 2, GG 1 nas cores Azul e Preto, quando a cliente pede 2 pacotes de Azul e 1 de Preto, então o carrinho recebe P 2, M 4, G 4, GG 2 em Azul e P 1, M 2, G 2, GG 1 em Preto, mostrados como "2 grades · 12 peças" e "1 grade · 6 peças"; a cor cujo estoque não fecha um pacote inteiro aparece indisponível.
- **CA-B31-13** (automática) — Grade fechada conferida no servidor. Dado o produto com grade P 1, M 2, G 2, GG 1, quando chega um pedido com P 2, M 4, G 3, GG 2 em Azul, então o pedido é recusado dizendo que a grade de Azul está quebrada; com P 2, M 4, G 4, GG 2 sai, e a mensagem traz "2 grades (12 peças)" em Azul.
- **CA-B31-09** (manual) — Aviso das regras no cartão e na página. Dado a loja de teste com um produto de cada regra, quando a Marcelle abre a vitrine no celular, então cada cartão e cada página mostra a regra em uma linha curta, legível, sem empurrar o preço para fora do cartão.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-03 | A grade fechada é definida sobre o primeiro tipo de variação (normalmente o tamanho) e repetida por opção do segundo (cor); produto com um tipo só tem um bloco. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-04 | Produto com grade fechada não aceita compra avulsa: só pacotes inteiros. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-05 | Sem preço próprio, o pacote custa a soma das peças pelo unitário (com faixa, se houver). | confirmada | Marcelle, 21/10/2026: o lojista pode dar preço próprio (CA-B31-15) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-02 | Grade fechada: o lojista precisa de preço próprio para o pacote (ex.: "grade de 6 por R$ 150"), ou basta a soma das peças (SUP-B31-05)? | respondida | Marcelle, 21/10/2026: idem; preço próprio opcional, senão a soma |

## Cenários

### Happy Path
1. No editor do produto, em "Regras de venda", o lojista liga "Vender só em grade fechada" (só aparece quando o primeiro tipo de variação tem opções) e preenche uma quantidade por opção (P 1, M 2, G 2, GG 1) e, se quiser, o preço da grade. Salvar confere no servidor e grava `pack_quantities` e `pack_price` em `catalog_products`.
2. A loja pública lê a grade. O cartão mostra "Grade fechada de 6 peças" (com o preço da grade, se houver); a página mostra a grade (P 1 · M 2 · G 2 · GG 1).
3. Na página do produto, no lugar da grade de quantidades livre, cada bloco (cor) tem um contador de pacotes. O botão "Adicionar" soma as peças (2 pacotes × 6) e o valor (soma das peças pelo unitário da faixa, ou o preço da grade × pacotes).
4. Cada pacote vira as linhas da grade no carrinho (P 2, M 4, G 4, GG 2 em Azul). As linhas de um bloco aparecem juntas, com "2 grades · 12 peças", e o contador do bloco muda todas de uma vez; remover tira o bloco inteiro.
5. Ao fazer o pedido, o servidor confere que as quantidades de cada bloco são múltiplos exatos da grade; grava os itens por combinação (como hoje), com unitário = preço da grade ÷ peças da grade (ou a faixa/base); a mensagem traz "Camiseta (Azul): 2 grades (12 peças)" e o detalhe por tamanho.

### Edge Cases
- Bloco (cor) sem estoque para um pacote inteiro (alguma opção com estoque menor que a quantidade da grade) aparece indisponível; o máximo de pacotes é o menor `estoque ÷ quantidade` entre as opções da grade.
- Produto com um tipo só: um bloco.
- Preço da grade que não divide exato pelas peças (R$ 149 ÷ 6): o unitário fica arredondado em centavos e o total das linhas pode diferir do preço da grade em alguns centavos; a mensagem mostra o unitário gravado.
- Carrinho antigo no aparelho com linhas avulsas de um produto que virou grade fechada: o servidor recusa ("grade quebrada") e a cliente refaz a partir da página do produto.
- Opção do primeiro tipo sem quantidade na grade (0): não entra no pacote.
- Faixas de preço do produto não valem quando há preço da grade; sem preço da grade, valem sobre o total de peças.

### Cenário de Erro
- Editor: grade ligada em produto sem variação → "Grade fechada: o produto precisa ter variação (ex.: Tamanho)"; todas as quantidades zero → "Grade fechada: informe ao menos uma quantidade"; preço da grade zero ou negativo → "Preço da grade: informe um valor maior que zero".
- Pedido com quantidades fora da grade → "Camiseta: a grade de Azul está quebrada. Cada grade tem P 1 · M 2 · G 2 · GG 1."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B31-03 | automática | `src/test/catalogo-produtos.integration.test.ts` | grade P1 M2 G2 GG1 salva e devolvida (6 peças); sem variação recusada; toda zero recusada |
| CA-B31-15 | automática | `src/test/catalogo-produtos.integration.test.ts` | preço da grade 150 salvo; zero e negativo recusados |
| CA-B31-15 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | página mostra a grade por R$ 150,00 (R$ 25,00 a peça) e, sem preço próprio, R$ 179,40; o botão de 1 grade mostra R$ 150,00 |
| CA-B31-15 | automática | `src/test/catalogo-pedido.integration.test.ts` | pedido de 1 grade com preço 150 grava unitário 25,00, total 150,00 e a mensagem traz R$ 25,00 cada |
| CA-B31-07 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | 2 pacotes de Azul e 1 de Preto chamam `onAdicionar` com P 2, M 4, G 4, GG 2 (Azul) e P 1, M 2, G 2, GG 1 (Preto); o carrinho mostra "2 grades · 12 peças" e "1 grade · 6 peças"; cor sem estoque para um pacote aparece indisponível |
| CA-B31-13 | automática | `src/test/catalogo-pedido.integration.test.ts` | P 2, M 4, G 3, GG 2 em Azul é recusado dizendo que a grade de Azul está quebrada; P 2, M 4, G 4, GG 2 sai e a mensagem traz "2 grades (12 peças)" em Azul |
| CA-B31-09 | manual | roteiro abaixo | no celular, cartão e página mostram cada regra em uma linha curta, sem empurrar o preço |

### Roteiro manual — CA-B31-09
1. Na empresa de teste, deixe três produtos visíveis: um com faixa "a partir de 12: R$ 24,90", um com mínimo 6 e um com grade fechada P 1, M 2, G 2, GG 1 (pode ser o mesmo produto com as três).
2. No celular, abra `/loja/teste-b11` e role a vitrine.
3. Em cada cartão, a regra aparece em uma linha curta abaixo do preço ("A partir de 12: R$ 24,90 · mínimo 6 peças" / "Grade fechada de 6 peças"), legível, sem cortar o preço nem estourar o cartão.
4. Abra cada produto: a página repete a regra abaixo do preço e, no de grade fechada, mostra a grade e o contador de pacotes por cor.

## Banco de Dados

- Tabela: `catalog_products`
  - `pack_quantities` (jsonb, nulo) — `{"P": 1, "M": 2, "G": 2, "GG": 1}`, por opção do primeiro tipo; nulo = venda avulsa
  - `pack_price` (numeric(12,2), nulo) — preço próprio da grade; nulo = soma das peças
- Migration: `supabase/migrations/20261021000005_grade_fechada.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261021000005_grade_fechada.sql` — as duas colunas
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado
- **Modificar:** `src/lib/catalogo/regras-de-venda.ts` — `GradeFechada`, `validarGrade`, `pecasDaGrade`, `precoDaGrade`, `unitarioDaGrade`, `pacotesDoBloco`, `pacotesQueCabem`, `blocoDaCombinacao`, `resumoDaGrade`, `detalheDaGrade`
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — `grade` em `ProdutoEditavel`; interruptor, quantidades por opção e preço da grade
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/page.tsx` — produto novo nasce sem grade
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — `carregarProduto` devolve e `salvarProduto` confere e grava a grade
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `grade` em `ProdutoVitrine` e `ProdutoDetalhe`
- **Modificar:** `src/app/loja/components/vitrine.tsx` — resumo da grade no cartão
- **Criar:** `src/app/loja/components/contador-de-grades.tsx` — contador de pacotes por bloco (página do produto)
- **Modificar:** `src/app/loja/components/pagina-produto.tsx` — grade fechada: contador no lugar da grade livre, preço por pacote
- **Modificar:** `src/app/loja/components/carrinho-local.ts` — `grade` no item guardado; `mudarQuantidades` em lote; `removerVarios`
- **Modificar:** `src/app/loja/components/carrinho.tsx` — linhas do bloco juntas com "N grades · M peças", contador por bloco, remover o bloco
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — passa grade e as ações em lote
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx` — passa a grade ao item do carrinho
- **Modificar:** `src/app/loja/components/pedido.ts` — linhas de grade na mensagem
- **Modificar:** `src/lib/catalogo/pedidos.ts` — confere a grade por bloco, unitário da grade, mensagem
- **Modificar:** `src/test/catalogo-produtos.integration.test.ts` — CA-B31-03, CA-B31-15
- **Modificar:** `src/test/catalogo-loja-publica.integration.test.ts` — o produto de teste ganha o campo novo (só o tipo)
- **Modificar:** `src/test/catalogo-carrinho-regras.test.tsx` — CA-B31-07, CA-B31-15
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — CA-B31-13, CA-B31-15

## Checklist

- [x] Migration criada e aplicada; tipos regenerados
- [x] Funções puras da grade fechada
- [x] Editor: interruptor, quantidades e preço da grade; ação de salvar conferindo no servidor
- [x] Loja pública devolve a grade; cartão e página mostram
- [x] Página do produto: contador de pacotes por bloco, indisponível sem estoque para um pacote, preço por pacote
- [x] Carrinho: linhas do bloco juntas, contador e remoção por bloco
- [x] Servidor: grade conferida por bloco, unitário da grade, mensagem com "N grades (M peças)"
- [x] Testes da tabela Prova passando

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B31-09 | Marcelle | 25/10/2026 |
