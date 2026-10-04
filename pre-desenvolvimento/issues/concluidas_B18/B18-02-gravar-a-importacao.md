# B18-02: Gravar a importação

**Tipo:** Implementação
**Página:** Página de importação (`/catalogo/importar`)
**Spec:** `pre-desenvolvimento/spec-importar-produtos.md`

## Descrição

O botão "Importar N produtos" grava os produtos sem erro. Para cada um:
- cria o produto, ou atualiza o que já existe pelo código;
- grava variações, estoque por combinação e visibilidade;
- cria as categorias novas.

Na atualização, campo vazio não apaga nada, e combinações ausentes da planilha continuam no produto.

Cada produto é gravado inteiro ou não é gravado. A página mostra o progresso e, no fim, o resultado.

As fotos ficam para a B18-03.

## Pronto quando

Ao confirmar, os produtos novos aparecem na lista e na vitrine, e os existentes ficam com o preço e o estoque da planilha.

Reimportar a mesma planilha não duplica nada.

O resultado mostra "N produtos importados: X novos e Y atualizados", com os botões "Ver produtos" e "Importar outra planilha".

## Cenários

### Happy Path
1. Na prévia, a lojista toca em "Importar N produtos".
2. O navegador manda os códigos sem erro em lotes de 10, junto com o mesmo arquivo. A cada lote, o servidor:
   - lê a planilha de novo;
   - confere tudo outra vez;
   - cria as categorias novas;
   - grava cada produto com `importar_produto_catalogo`, que faz produto e estoque numa transação só.
3. A tela mostra "Importando X de N...".
4. No fim aparece "N produtos importados: X novos e Y atualizados", com os botões "Ver produtos" e "Importar outra planilha".

### Edge Cases
- **Atualização:** coluna vazia mantém o valor atual, e estoque vazio mantém o estoque da combinação.
- **Combinações:** uma combinação nova é acrescentada, e as opções novas entram no fim do tipo de variação. As combinações ausentes da planilha continuam no produto.
- **Produto novo:** entra no fim da sua categoria, na ordem da planilha. Visível vazio vale sim e estoque vazio vale 0.
- **Categoria:** é criada uma vez só, mesmo que vários produtos a usem. Nomes iguais sem diferenciar maiúscula e acento são a mesma categoria.
- **Reimportar a mesma planilha:** atualiza, não duplica.
- **Planilha mudou desde a prévia:** um produto que passou a ter erro vai para a lista de falhas e não é gravado.

### Cenário de Erro
- **"Preço de" menor que o preço novo:** se o "Preço de" final (o da planilha ou o atual) não for maior que o preço novo, o produto vira erro já na prévia (`montarPrevia`).
- **Falha ao gravar um produto:** ele aparece no resultado com o código e o motivo, e os outros seguem.
- **Sessão expirada ou Atendente:** a ação recusa.

## Banco de Dados

- **Função `importar_produto_catalogo(p_produto uuid, p_dados jsonb, p_estoque jsonb) returns uuid`**, `security invoker`, de modo que o RLS de Admin e Gerente vale. Ela:
  - cria o produto (com `position` no fim da categoria) ou atualiza o produto da própria empresa;
  - faz o upsert do estoque das combinações dadas;
  - roda tudo numa transação.
- **Migration:** `supabase/migrations/20261005000001_catalogo_importar_produto.sql`.

## Arquivos

- **Criar:** `supabase/migrations/20261005000001_catalogo_importar_produto.sql`: a função.
- **Modificar:** `src/lib/catalogo/importacao.ts`:
  - `montarPrevia` passa a checar o "Preço de" final;
  - novo `gravarImportacao(supabase, workspaceId, produtos)`, que resolve ou cria as categorias, junta as variações e o estoque com os do produto existente e chama a função para cada produto.
- **Modificar:** `src/app/(auth)/catalogo/importar/actions.ts`: `importarLote(formData)`, com o arquivo e os códigos do lote.
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx`: botão "Importar N produtos", progresso por lote e tela de resultado.
- **Modificar:** `src/test/catalogo-importacao.integration.test.ts`: casos da B18-02, que são:
  - criar e atualizar;
  - vazio não apaga;
  - combinação nova;
  - categoria criada uma vez;
  - reimportar não duplica;
  - outra empresa não é tocada;
  - Atendente recusado.

## Checklist

- [x] Migration com `importar_produto_catalogo` aplicada (`db push`)
- [x] `gravarImportacao`: categorias, junção de variações e estoque, chamada por produto
- [x] Checagem do "Preço de" final na prévia
- [x] Ação `importarLote`
- [x] Botão, progresso e resultado na página
- [x] Testes de integração da B18-02 passando
- [x] Lint e tipos sem erro
