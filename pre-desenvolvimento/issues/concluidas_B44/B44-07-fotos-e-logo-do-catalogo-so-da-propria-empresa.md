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

## Cenários

### Happy Path
1. O Gerente troca a foto de um produto, apaga o produto ou troca a logo ou o banner.
2. O servidor lê do banco os caminhos antigos e apaga do armazenamento só os que estão na pasta da própria empresa (`<empresa>/produtos/` ou `<empresa>/marca/`, nome de arquivo simples).
3. Foto, logo e banner novos só são aceitos em PNG, JPG ou WebP.

### Edge Cases
- Caminho gravado direto no banco que aponta para outra empresa, ou com `..`: não é apagado (fica no banco, sem efeito no armazenamento).
- Importação por planilha que substitui fotos: as antigas, lidas do banco, passam pelo mesmo filtro.
- Logo SVG que já existe continua aparecendo (SUP-B44-06); só o envio novo é recusado. O bucket deixa de aceitar SVG.
- Caminho novo de foto com `..` depois da pasta da empresa (`A/produtos/../../B/...`): recusado ao salvar.

### Cenário de Erro
- Foto ou logo em SVG: "Use fotos JPG, PNG ou WebP." (produto) ou "Use PNG, JPG ou WebP." (logo e banner), e nenhum endereço de envio é criado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-26 | automática | `src/test/catalogo-fotos-da-propria-empresa.integration.test.ts` | com o caminho de uma imagem de B gravado direto num produto de A, trocar a foto e apagar o produto deixam a imagem de B no armazenamento |
| CA-B44-27 | automática | `src/test/catalogo-fotos-da-propria-empresa.integration.test.ts` | com o caminho de uma imagem de B gravado direto como logo de A, trocar a logo deixa a imagem de B no armazenamento |
| CA-B44-28 | automática | `src/test/catalogo-fotos-da-propria-empresa.integration.test.ts` | trocar a foto de um produto de A deixa a nova no produto e tira a antiga do armazenamento |
| CA-B44-32 | automática | `src/test/catalogo-fotos-da-propria-empresa.integration.test.ts` | pedir envio de foto ou de logo SVG volta o aviso de formato e não cria endereço de envio |

## Banco de Dados

- Bucket `catalog-images`: `allowed_mime_types` passa a ser só `image/jpeg`, `image/png` e `image/webp`.

## Arquivos

- **Criar:** `supabase/migrations/20261027000004_catalogo_sem_svg.sql` — tira o SVG do bucket do catálogo
- **Modificar:** `src/lib/catalogo/regras.ts` — logo aceita os mesmos formatos da foto; `caminhoDaEmpresa` diz se um caminho é de arquivo da pasta da empresa
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — caminho novo conferido com `caminhoDaEmpresa`; só caminhos da empresa são apagados ao trocar foto e ao apagar produto
- **Modificar:** `src/app/(auth)/catalogo/aparencia/actions.ts` — aviso de formato sem SVG; `caminhoDaMarca` e a limpeza de logo e banner com `caminhoDaEmpresa`
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — o aviso e a dica da logo deixam de citar SVG
- **Modificar:** `src/lib/catalogo/importacao.ts` — fotos antigas só saem do armazenamento se forem da empresa
- **Modificar:** `src/test/catalogo-loja-publica.integration.test.ts` — o teste da B16 "logo aceita SVG" passa a conferir que a logo também recusa SVG, que é a regra nova
- **Criar:** `src/test/catalogo-fotos-da-propria-empresa.integration.test.ts` — CA-B44-26, 27, 28 e 32 no Supabase real

## Checklist

- [x] `caminhoDaEmpresa` e formatos da logo sem SVG
- [x] Limpeza de foto, produto, logo, banner e importação só na pasta da empresa
- [x] Migration do bucket sem SVG
- [x] Testes do CA-B44-26, 27, 28 e 32
