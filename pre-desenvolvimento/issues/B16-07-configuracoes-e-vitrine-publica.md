# B16-07: Configurações do catálogo e vitrine pública no ar

**Tipo:** Implementação
**Página:** Configurações do catálogo, Vitrine pública, Página do produto
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Configurações do catálogo", "Vitrine pública" e "Página do produto" (com a aparência padrão)
**Depende de:** B16-06 e B16-03 aprovado

## Descrição

O lojista escolhe endereço, número que recebe pedidos, pedido mínimo e mensagem de
fechamento e publica; a vitrine pública abre sem login no endereço escolhido, com
categorias, busca, página do produto, variação indisponível sem estoque, prévia do link no
WhatsApp com o nome da loja, e "Catálogo indisponível" quando despublicado. Ainda com a
aparência padrão (a personalização é a B16-08).

## Pronto quando

Em produção, depois de publicar, o link `/loja/<endereço>` abre num celular sem login e
mostra os produtos visíveis por categoria, a página do produto com variações e as
combinações sem estoque indisponíveis; despublicar troca a página por "Catálogo
indisponível no momento".
