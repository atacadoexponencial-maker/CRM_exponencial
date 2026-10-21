# Spec: Regras de venda do catálogo

> série: B31
> estado: rascunho

## Visão Geral

A loja do catálogo (B16/B17) vende hoje do mesmo jeito para qualquer peça: um preço por
produto, qualquer quantidade por combinação e um pedido mínimo único para a loja toda.
A pesquisa de 21/10/2026 sobre catálogos de atacado (sem checkout) mostrou quatro regras
que o mercado espera e que a loja ainda não tem:

1. **Preço por quantidade**: a peça fica mais barata a partir de tantas unidades.
2. **Mínimo por produto**: cada peça tem a sua quantidade mínima, além do mínimo da loja.
3. **Grade fechada**: o produto só sai em pacote com quantidades fixas por tamanho
   (ex.: 1 P, 2 M, 2 G, 1 GG), e a cliente escolhe quantos pacotes de cada cor.
4. **Repetir o último pedido**: a cliente que já comprou monta o carrinho de novo com
   um toque.

É para o lojista (Admin e Gerente, que cadastram as regras no CRM) e para a cliente da
loja (que vê a regra na vitrine e é impedida de fechar pedido fora dela). Resolve o
pedido que chega "errado" no WhatsApp e precisa ser renegociado à mão: quantidade
abaixo do que a marca aceita, grade quebrada, preço de varejo em pedido de atacado.

Toda conferência de regra é do servidor, na hora de registrar o pedido: o que a vitrine
mostra é só aviso.

Fora destas quatro: catálogo restrito (preço só para cliente aprovada) ficou de fora por
decisão da Marcelle em 21/10/2026.

## Páginas / Módulos

### Editor de produto (CRM, `/catalogo`)

**Descrição:** o cadastro do produto ganha as três regras de venda, todas opcionais.

**Componentes:**
- Faixas de preço: até 3 linhas "a partir de N peças, R$ X", abaixo do preço.
- Mínimo por produto: campo "mínimo de peças por pedido".
- Grade fechada: interruptor "vender só em grade fechada" e, ligado, uma quantidade por
  opção do primeiro tipo de variação (ex.: Tamanho: P 1, M 2, G 2, GG 1).

**Comportamentos:**
- Salvar faixas de preço: cada faixa tem quantidade inteira maior que 1 e preço menor
  que o preço base; as quantidades crescem e os preços decrescem; faixa repetida ou fora
  de ordem é recusada com aviso.
- Salvar mínimo por produto: inteiro maior ou igual a 1; vazio é "sem mínimo".
- Ligar grade fechada: só em produto com variação; a soma das quantidades do pacote é
  maior que zero; produto sem variação não mostra o interruptor.
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

#### CA-B31-04 — Regras na planilha de importação · prova: automática

- **Dado** o modelo de planilha da B18 com as colunas opcionais de faixas de preço,
  mínimo e grade
- **Quando** o lojista importa uma linha com "12=24,90;48=21,90", mínimo 6 e grade "P1 M2 G2 GG1"
- **Então** o produto nasce com as três regras, e linha com faixa inválida aparece na
  prévia como erro daquela linha, sem travar as outras

### Vitrine (loja pública, `/loja/[endereco]`)

**Descrição:** a cliente vê as regras antes de escolher, e o carrinho mostra o preço que
vai valer.

**Componentes:**
- No cartão e na página do produto: "a partir de 12: R$ 24,90", "mínimo 6 peças",
  "grade fechada de 6 peças" quando houver.
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
- A mensagem do WhatsApp mostra o preço da faixa e, se houver, "preço de 12+".

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
- Preço por quantidade contando o pedido inteiro (todas as peças de todos os produtos).
- Repetir pedido a partir do histórico do CRM por link enviado pelo vendedor (ver PER-B31-03).
- Baixa automática de estoque ao registrar o pedido (continua como na B16).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-01 | A faixa de preço conta as peças do mesmo produto somando todas as combinações (cores e tamanhos), não por combinação nem pelo pedido inteiro. | aberta | — |
| SUP-B31-02 | O mínimo por produto é em peças, somando todas as combinações. | aberta | — |
| SUP-B31-03 | A grade fechada é definida sobre o primeiro tipo de variação (normalmente o tamanho) e repetida por opção do segundo (cor); produto com um tipo só tem um bloco. | aberta | — |
| SUP-B31-04 | Produto com grade fechada não aceita compra avulsa: só pacotes inteiros. | aberta | — |
| SUP-B31-05 | O preço do pacote é a soma das peças pelo unitário (com faixa, se houver); não há preço próprio de pacote. | aberta | — |
| SUP-B31-06 | "Repetir último pedido" vale para o aparelho em que o pedido foi feito (a loja não tem login); o último pedido fica guardado no aparelho, como o carrinho. | aberta | — |
| SUP-B31-07 | No máximo 3 faixas de preço por produto. | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | aberta | — |
| PER-B31-02 | Grade fechada: o lojista precisa de preço próprio para o pacote (ex.: "grade de 6 por R$ 150"), ou basta a soma das peças (SUP-B31-05)? | aberta | — |
| PER-B31-03 | Repetir pedido: só no aparelho da cliente (SUP-B31-06) é suficiente agora, ou já quer o link que o vendedor manda pelo CRM ("repetir pedido #12") abrindo a loja com o carrinho montado? Este segundo encaixa com a fonte unificada da B30, mas é uma entrega a mais. | aberta | — |
| PER-B31-04 | Ordem das entregas: faixas de preço e mínimo primeiro (mais pedidos), grade fechada depois, repetir pedido por último? | aberta | — |
