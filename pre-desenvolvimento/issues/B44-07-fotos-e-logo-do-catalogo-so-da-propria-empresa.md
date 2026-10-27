# B44-07: Fotos e logo do catálogo: só apaga o que é da empresa e sem SVG

**Tipo:** Implementação
**Página:** Catálogo → produtos e aparência da loja
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

Trocar ou apagar foto, produto, logo ou banner só apaga arquivos da própria empresa, e logo e fotos deixam de aceitar SVG.

## Pronto quando

Com o caminho de uma imagem de outra empresa gravado num produto, trocar a foto ou apagar o produto não apaga a imagem da outra empresa; trocar a própria foto continua apagando a antiga; enviar SVG mostra que a imagem precisa ser PNG, JPG ou WebP.

## Critérios de aceite

- **CA-B44-26** (automática) — Trocar foto de produto não apaga imagem de outra empresa. Dado uma imagem do catálogo da empresa B e um Gerente de A que gravou direto no banco, num produto de A, o caminho dessa imagem de B, quando o Gerente de A troca a foto do produto ou apaga o produto, então a imagem de B continua no ar
- **CA-B44-27** (automática) — Trocar logo ou banner não apaga imagem de outra empresa. Dado uma imagem da empresa B e o caminho dela gravado direto no banco como logo ou banner da loja de A, quando o Gerente de A troca ou remove a logo ou o banner, então a imagem de B continua no ar
- **CA-B44-28** (automática) — Trocar a foto da própria empresa apaga a antiga. Dado um produto de A com foto, quando o Gerente de A troca a foto, então a foto nova aparece e a antiga deixa de existir no armazenamento, como hoje
- **CA-B44-32** (automática) — Logo e fotos do catálogo não aceitam SVG. Dado o Gerente enviando a logo ou uma foto de produto, quando o arquivo é SVG, então a tela avisa que a imagem precisa ser PNG, JPG ou WebP, e nada é guardado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-06 | Tirar SVG da logo e das fotos do catálogo não afeta ninguém, porque ainda não há clientes reais (regra de 25/10). Uma logo SVG que já exista continua aparecendo; só um envio novo é recusado | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

Nenhuma.
