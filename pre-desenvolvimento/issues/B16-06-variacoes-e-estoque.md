# B16-06: Variações e grade de estoque do produto

**Tipo:** Implementação
**Página:** Editor de produto, Produtos
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seção "Editor de produto" (variações e grade de estoque) e selo "Esgotado" da lista
**Depende de:** B16-05

## Descrição

Até dois tipos de variação por produto, com suas opções, e a grade com o estoque de cada
combinação (ou estoque único sem variação); remover opção com estoque pede confirmação;
a lista mostra estoque total e o selo Esgotado.

## Pronto quando

No CRM publicado, um Admin cria um produto com Tamanho (P, M, G) e Cor (Azul, Preto),
preenche o estoque das 6 combinações, remove uma opção com confirmação, e a lista mostra o
estoque total e "Esgotado" quando tudo está em zero.
