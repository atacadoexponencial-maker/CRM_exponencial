# Spec: Regras de venda do catálogo

> série: B31
> estado: aprovada em 21/10/2026

## Visão Geral

A loja do catálogo (B16/B17) vende hoje do mesmo jeito para qualquer peça: um preço por
produto, qualquer quantidade por combinação e um pedido mínimo único para a loja toda.
A pesquisa de 21/10/2026 sobre catálogos de atacado (sem checkout) mostrou quatro regras
que o mercado espera e que a loja ainda não tem:

1. **Preço por quantidade**: a peça fica mais barata a partir de tantas unidades, por
   produto ("a partir de 12 camisetas, R$ 24,90") ou pelo pedido inteiro ("acima de 50
   peças no pedido, 10% a menos"). O lojista escolhe o jeito dele; pode usar os dois.
2. **Mínimo por produto**: cada peça tem a sua quantidade mínima, além do mínimo da loja.
3. **Grade fechada**: o produto só sai em pacote com quantidades fixas por tamanho
   (ex.: 1 P, 2 M, 2 G, 1 GG), e a cliente escolhe quantos pacotes de cada cor. O
   pacote custa a soma das peças ou um preço próprio que o lojista dá.
4. **Repetir o último pedido**: a cliente que já comprou monta o carrinho de novo com
   um toque.

É para o lojista (Admin e Gerente, que cadastram as regras no CRM) e para a cliente da
loja (que vê a regra na vitrine e é impedida de fechar pedido fora dela). Resolve o
pedido que chega "errado" no WhatsApp e precisa ser renegociado à mão: quantidade
abaixo do que a marca aceita, grade quebrada, preço de varejo em pedido de atacado.

Toda conferência de regra é do servidor, na hora de registrar o pedido: o que a vitrine
mostra é só aviso.

Decisões da Marcelle em 21/10/2026: catálogo restrito (preço só para cliente aprovada)
fica de fora; como a faixa de preço conta e quanto custa a grade são regras do negócio
de cada atacadista, o sistema oferece as duas formas e o lojista escolhe; repetir
pedido vale no aparelho da cliente; ordem das entregas: faixas e mínimo, grade fechada,
repetir pedido.

## Páginas / Módulos

### Editor de produto (CRM, `/catalogo`)

**Descrição:** o cadastro do produto ganha as três regras de venda, todas opcionais.

**Componentes:**
- Faixas de preço: até 3 linhas "a partir de N peças, R$ X", abaixo do preço.
- Mínimo por produto: campo "mínimo de peças por pedido".
- Grade fechada: interruptor "vender só em grade fechada" e, ligado, uma quantidade por
  opção do primeiro tipo de variação (ex.: Tamanho: P 1, M 2, G 2, GG 1) e um campo
  opcional "preço da grade"; vazio, a grade custa a soma das peças.

**Comportamentos:**
- Salvar faixas de preço: cada faixa tem quantidade inteira maior que 1 e preço menor
  que o preço base; as quantidades crescem e os preços decrescem; faixa repetida ou fora
  de ordem é recusada com aviso.
- Salvar mínimo por produto: inteiro maior ou igual a 1; vazio é "sem mínimo".
- Ligar grade fechada: só em produto com variação; a soma das quantidades do pacote é
  maior que zero; produto sem variação não mostra o interruptor.
- Preço da grade: opcional, maior que zero; quando preenchido, vale no lugar da soma
  das peças (e as faixas de preço do produto não se aplicam a ele).
- Importar por planilha (B18): as três regras entram como colunas opcionais do modelo.

**Critérios de aceite:**

#### CA-B31-01 — Faixas de preço salvas e conferidas · prova: automática

- **Dado** um produto com preço R$ 29,90
- **Quando** o lojista salva as faixas "a partir de 12: R$ 24,90" e "a partir de 48: R$ 21,90"
- **Então** o produto fica com as duas faixas, e salvar "a partir de 12: R$ 31,00"
  (acima do preço base) ou "a partir de 48: R$ 25,00" depois de "a partir de 12: R$ 24,90"
  (preço que não desce) é recusado com aviso

#### CA-B31-02 — Mínimo por produto salvo · prova: automática

- **Dado** um produto sem mínimo
- **Quando** o lojista salva mínimo 6
- **Então** o produto fica com mínimo 6; salvar 0 ou texto é recusado; limpar o campo
  volta a "sem mínimo"

#### CA-B31-03 — Grade fechada salva · prova: automática

- **Dado** um produto com Tamanho (P, M, G, GG) e Cor (Azul, Preto)
- **Quando** o lojista liga a grade fechada com P 1, M 2, G 2, GG 1
- **Então** o produto fica com a grade de 6 peças; produto sem variação não aceita grade
  fechada; grade com todas as quantidades zero é recusada

#### CA-B31-15 — Preço próprio da grade · prova: automática

- **Dado** o produto com grade de 6 peças a R$ 29,90 cada
- **Quando** o lojista preenche "preço da grade" R$ 150,00
- **Então** a página do produto, o carrinho e a mensagem do pedido mostram a grade por
  R$ 150,00 (R$ 25,00 a peça); com o campo vazio, R$ 179,40; preço zero ou negativo é
  recusado

#### CA-B31-04 — Regras na planilha de importação · prova: automática

- **Dado** o modelo de planilha da B18 com as colunas opcionais de faixas de preço,
  mínimo e grade
- **Quando** o lojista importa uma linha com "12=24,90;48=21,90", mínimo 6 e grade "P1 M2 G2 GG1"
- **Então** o produto nasce com as três regras, e linha com faixa inválida aparece na
  prévia como erro daquela linha, sem travar as outras

### Configurações do catálogo (CRM, `/catalogo/configuracoes`)

**Descrição:** além do pedido mínimo, a loja ganha o desconto por total de peças do
pedido, para o lojista que prefere a regra pelo pedido inteiro em vez de por produto.

**Componentes:**
- Desconto por pedido: até 3 linhas "a partir de N peças no pedido, X% a menos",
  abaixo do pedido mínimo.

**Comportamentos:**
- Salvar desconto por pedido: quantidades inteiras crescentes e porcentagens crescentes
  entre 1 e 90; linha repetida ou fora de ordem é recusada com aviso.
- O desconto por pedido se soma ao preço por produto: primeiro cada item recebe o preço
  da sua faixa (ou da grade), depois o desconto da loja vale sobre o total.

**Critérios de aceite:**

#### CA-B31-16 — Desconto por total do pedido salvo e conferido · prova: automática

- **Dado** a loja sem desconto por pedido
- **Quando** o lojista salva "a partir de 50 peças, 10%" e "a partir de 100 peças, 15%"
- **Então** a loja fica com as duas linhas; "a partir de 100, 5%" depois de "50, 10%"
  (porcentagem que não sobe) ou 0% ou 95% são recusados com aviso

#### CA-B31-17 — Desconto do pedido aplicado no carrinho e no servidor · prova: automática

- **Dado** a loja com "a partir de 50 peças, 10%" e um produto a R$ 29,90 com faixa
  "a partir de 12: R$ 24,90"
- **Quando** o carrinho tem 50 peças desse produto
- **Então** o carrinho mostra 50 × R$ 24,90 = R$ 1.245,00, "desconto de 10% do pedido:
  - R$ 124,50" e total R$ 1.120,50; o pedido registrado guarda o desconto e a compra do
  contato (B30) recebe esse desconto; com 49 peças não há desconto e o carrinho avisa
  "falta 1 peça para 10% de desconto"

### Vitrine (loja pública, `/loja/[endereco]`)

**Descrição:** a cliente vê as regras antes de escolher, e o carrinho mostra o preço que
vai valer.

**Componentes:**
- No cartão e na página do produto: "a partir de 12: R$ 24,90", "mínimo 6 peças",
  "grade fechada de 6 peças" (com o preço da grade, se houver) quando houver.
- No topo da vitrine, ao lado do pedido mínimo: "10% a menos a partir de 50 peças",
  quando a loja tem desconto por pedido.
- Na página de produto com grade fechada: a grade (P 1 · M 2 · G 2 · GG 1) e um contador
  de pacotes por cor, no lugar da grade de quantidades livre.
- No carrinho: preço unitário já na faixa alcançada; aviso do que falta para a próxima
  faixa; aviso de item abaixo do mínimo ou com grade quebrada.

**Comportamentos:**
- Preço por quantidade: a faixa conta todas as peças do mesmo produto no carrinho,
  somando cores e tamanhos. Mudar a quantidade recalcula na hora.
- Mínimo por produto: o botão "Adicionar" avisa quando a soma escolhida é menor que o
  mínimo; o carrinho marca a linha e não deixa fazer o pedido.
- Grade fechada: a cliente só escolhe quantos pacotes por bloco; cada pacote vira as
  linhas da grade no carrinho; bloco sem estoque para um pacote inteiro aparece como
  indisponível.
- Repetir último pedido: depois de um pedido registrado, a vitrine mostra "Repetir
  último pedido" (no cabeçalho e no carrinho vazio); tocar monta o carrinho com as peças
  do pedido anterior que ainda existem e têm estoque, e diz o que ficou de fora.

**Critérios de aceite:**

#### CA-B31-05 — Preço da faixa aplicado no carrinho · prova: automática

- **Dado** o produto com faixa "a partir de 12: R$ 24,90"
- **Quando** o carrinho tem 8 peças dele (4 azuis e 4 pretas) e a cliente sobe para 12
- **Então** o unitário mostrado passa de R$ 29,90 para R$ 24,90 em todas as linhas do
  produto, e com 8 o carrinho avisa "faltam 4 peças para R$ 24,90"

#### CA-B31-06 — Mínimo por produto avisado na vitrine · prova: automática

- **Dado** o produto com mínimo 6
- **Quando** a cliente escolhe 4 peças na página do produto
- **Então** o botão avisa "mínimo 6 peças" e não adiciona; com 6 ou mais adiciona; se o
  carrinho ficar com 4 (depois de diminuir), a linha avisa e "Fazer pedido" não segue

#### CA-B31-07 — Grade fechada na página do produto · prova: automática

- **Dado** o produto com grade P 1, M 2, G 2, GG 1 nas cores Azul e Preto
- **Quando** a cliente pede 2 pacotes de Azul e 1 de Preto
- **Então** o carrinho recebe P 2, M 4, G 4, GG 2 em Azul e P 1, M 2, G 2, GG 1 em Preto,
  mostrados como "2 grades · 12 peças" e "1 grade · 6 peças"; a cor cujo estoque não
  fecha um pacote inteiro aparece indisponível

#### CA-B31-08 — Repetir o último pedido · prova: automática

- **Dado** uma cliente que fez um pedido neste aparelho com 3 produtos, um deles depois
  oculto pelo lojista
- **Quando** ela toca "Repetir último pedido"
- **Então** o carrinho fica com os 2 produtos que ainda existem, nas quantidades de
  antes (limitadas ao estoque de hoje), e a tela diz qual ficou de fora e por quê

#### CA-B31-09 — Aviso das regras no cartão e na página · prova: manual

- **Dado** a loja de teste com um produto de cada regra
- **Quando** a Marcelle abre a vitrine no celular
- **Então** cada cartão e cada página mostra a regra em uma linha curta, legível, sem
  empurrar o preço para fora do cartão

### Registro do pedido (servidor)

**Descrição:** o servidor confere as três regras com os dados do banco e grava o preço
que valeu. Nada do navegador é confiável.

**Comportamentos:**
- Preço: o unitário gravado em cada item é o da faixa alcançada pela soma das peças do
  produto no pedido. A conferência de "preço mudou" (QA A9) compara com esse preço, não
  com o base.
- Mínimo por produto: pedido com produto abaixo do mínimo é recusado dizendo qual.
- Grade fechada: pedido com quantidades que não são múltiplos exatos da grade, por
  bloco, é recusado dizendo qual; a mensagem do WhatsApp mostra "2 grades (12 peças)"
  antes das linhas.
- A mensagem do WhatsApp mostra o preço da faixa e, se houver, "preço de 12+"; com
  desconto por pedido, mostra o subtotal, a linha do desconto e o total.

**Critérios de aceite:**

#### CA-B31-10 — Pedido gravado com o preço da faixa · prova: automática

- **Dado** o produto com faixa "a partir de 12: R$ 24,90"
- **Quando** a loja registra um pedido com 12 peças dele
- **Então** os itens ficam com unitário R$ 24,90, a mensagem traz R$ 24,90 e o total de
  R$ 298,80; com 11 peças fica R$ 29,90

#### CA-B31-11 — Preço enviado pelo navegador não vale · prova: automática

- **Dado** o mesmo produto
- **Quando** o navegador manda 12 peças dizendo que viu R$ 24,90, mas o lojista tirou a
  faixa antes de o pedido chegar
- **Então** o pedido não sai, avisa que o preço mudou e devolve R$ 29,90 (como no QA A9)

#### CA-B31-12 — Mínimo por produto conferido no servidor · prova: automática

- **Dado** o produto com mínimo 6
- **Quando** chega um pedido com 4 peças dele, ainda que o mínimo da loja esteja batido
- **Então** o pedido é recusado dizendo "Camiseta: mínimo 6 peças"

#### CA-B31-13 — Grade fechada conferida no servidor · prova: automática

- **Dado** o produto com grade P 1, M 2, G 2, GG 1
- **Quando** chega um pedido com P 2, M 4, G 3, GG 2 em Azul
- **Então** o pedido é recusado dizendo que a grade de Azul está quebrada; com P 2, M 4,
  G 4, GG 2 sai, e a mensagem traz "2 grades (12 peças)" em Azul

#### CA-B31-14 — Regras não valem para quem não as tem · prova: automática

- **Dado** uma loja com produtos sem nenhuma regra
- **Quando** chega um pedido como hoje
- **Então** tudo segue igual à B16: preço base, qualquer quantidade, só o mínimo da loja

## Fora de escopo

- Catálogo restrito (preço escondido até aprovação ou login): decisão de 21/10/2026.
- Tabela de preço por cliente (preço diferente para cada contato).
- Repetir pedido a partir do histórico do CRM por link enviado pelo vendedor (ver PER-B31-03).
- Baixa automática de estoque ao registrar o pedido (continua como na B16).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-01 | A faixa de preço do produto conta as peças do mesmo produto somando todas as combinações (cores e tamanhos). | confirmada | Marcelle, 21/10/2026: é uma das duas formas; a outra é o desconto por total do pedido (CA-B31-16) |
| SUP-B31-02 | O mínimo por produto é em peças, somando todas as combinações. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-03 | A grade fechada é definida sobre o primeiro tipo de variação (normalmente o tamanho) e repetida por opção do segundo (cor); produto com um tipo só tem um bloco. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-04 | Produto com grade fechada não aceita compra avulsa: só pacotes inteiros. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-05 | Sem preço próprio, o pacote custa a soma das peças pelo unitário (com faixa, se houver). | confirmada | Marcelle, 21/10/2026: o lojista pode dar preço próprio (CA-B31-15) |
| SUP-B31-06 | "Repetir último pedido" vale para o aparelho em que o pedido foi feito (a loja não tem login); o último pedido fica guardado no aparelho, como o carrinho. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-09 | Na página do produto, o mínimo e a faixa contam as peças escolhidas mais as que já estão no carrinho do mesmo produto. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-08 | Quando a loja tem desconto por pedido e o produto tem faixa, os dois valem: a faixa dá o unitário e o desconto da loja entra sobre o total. | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | respondida | Marcelle, 21/10/2026: regra do negócio de cada atacadista; o sistema oferece as duas e o lojista escolhe |
| PER-B31-02 | Grade fechada: o lojista precisa de preço próprio para o pacote (ex.: "grade de 6 por R$ 150"), ou basta a soma das peças (SUP-B31-05)? | respondida | Marcelle, 21/10/2026: idem; preço próprio opcional, senão a soma |
| PER-B31-03 | Repetir pedido: só no aparelho da cliente (SUP-B31-06) é suficiente agora, ou já quer o link que o vendedor manda pelo CRM ("repetir pedido #12") abrindo a loja com o carrinho montado? | respondida | Marcelle, 21/10/2026: só no aparelho |
| PER-B31-04 | Ordem das entregas: faixas de preço e mínimo primeiro (mais pedidos), grade fechada depois, repetir pedido por último? | respondida | Marcelle, 21/10/2026: OK |
