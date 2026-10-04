# B18-03: Fotos por link

**Tipo:** Implementação
**Página:** Página de importação (`/catalogo/importar`)
**Spec:** `pre-desenvolvimento/spec-importar-produtos.md`

## Descrição

A coluna Fotos passa a valer:
- a importação baixa as imagens dos links, até 8 por produto, em JPG, PNG ou WebP, com até 5 MB cada, e guarda no catálogo na ordem da planilha;
- na atualização, a coluna preenchida substitui as fotos do produto e a vazia mantém as atuais;
- link quebrado, que não é imagem ou grande demais vira aviso no resultado, e o produto entra sem aquela foto.

## Pronto quando

Os produtos importados com links aparecem com as fotos na lista e na vitrine.

O resultado lista as fotos que não deu para baixar, com o código do produto e o número da foto.

## Cenários

### Happy Path
1. Um produto da planilha traz links na coluna Fotos.
2. Ao gravar o lote, o servidor:
   - baixa cada imagem, até 8 por produto;
   - confere se é JPG, PNG ou WebP de até 5 MB;
   - guarda em `empresa/produtos/<id>.<ext>`, na ordem da planilha;
   - grava os caminhos junto com o produto, na mesma chamada de `importar_produto_catalogo`.
3. A lista e a vitrine mostram as fotos.

### Edge Cases
- **Atualização com a coluna preenchida:** as fotos baixadas substituem as do produto, e as antigas são apagadas do armazenamento, como o editor já faz.
- **Atualização com a coluna vazia:** mantém as fotos.
- **Nenhuma foto baixou:** numa atualização, o produto mantém as fotos atuais e cada link vira aviso.
- **Falha ao gravar o produto:** as fotos recém-baixadas dele são apagadas do armazenamento.
- **Prazo:** cada download tem 15 segundos. As fotos de um produto são baixadas em paralelo.

### Cenário de Erro
Estes casos viram aviso no resultado ("VES-004: a foto 2 não abriu (link quebrado)."), e o produto entra sem aquela foto:
- link que não abre, que demora demais ou que responde com erro;
- arquivo que não é imagem;
- imagem acima de 5 MB.

Link para a rede interna (localhost, IPs privados, `169.254.x`), direto ou por redirecionamento, é recusado com o mesmo aviso de link que não abre. O redirecionamento segue no máximo 3 vezes.

## Banco de Dados

- **Migration `supabase/migrations/20261005000002_catalogo_importar_fotos.sql`:** troca `importar_produto_catalogo` para gravar `photos` quando `p_dados` traz a chave. Sem a chave, o produto novo fica sem fotos e o existente mantém as dele.

## Arquivos

- **Criar:** `supabase/migrations/20261005000002_catalogo_importar_fotos.sql`
- **Criar:** `src/lib/catalogo/baixar-foto.ts`
  - só no servidor: `baixarFoto(url)` faz o download seguro;
  - cobre a checagem de rede interna, o redirecionamento manual, o prazo, o limite de 5 MB e o tipo da imagem;
  - devolve os bytes e a extensão, ou o motivo da falha.
- **Modificar:** `src/lib/catalogo/importacao.ts`
  - `ProdutoExistente.fotos`;
  - `gravarImportacao` baixa, guarda, grava e limpa as fotos;
  - `ResultadoGravacao.avisos`.
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx`: soma os avisos dos lotes e mostra "Fotos que não entraram" no resultado.
- **Modificar:** `src/test/catalogo-importacao.integration.test.ts`: casos da B18-03:
  - foto baixada e guardada;
  - link quebrado vira aviso;
  - arquivo que não é imagem vira aviso;
  - endereço interno é recusado;
  - coluna vazia mantém as fotos;
  - coluna preenchida substitui as fotos.

## Checklist

- [x] Migration das fotos aplicada (`db push`)
- [x] `baixarFoto` com as proteções
- [x] `gravarImportacao` com as fotos e os avisos
- [x] Avisos no resultado da página
- [x] Testes de integração da B18-03 passando
- [x] Lint e tipos sem erro
