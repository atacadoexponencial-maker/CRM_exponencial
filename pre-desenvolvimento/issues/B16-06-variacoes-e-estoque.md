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

## Cenários

### Happy Path
1. O editor real passa a mostrar **Variações e estoque** (componente da B16-01): até 2
   tipos, opções, e a grade com o estoque de cada combinação (sem variação, um estoque
   único).
2. Salvar grava os tipos no produto e uma linha de estoque por combinação; reabrir mostra
   tudo igual.
3. A lista mostra "N em estoque" e o selo **Esgotado** quando todas as combinações estão
   em zero.

### Edge Cases
- Remover opção com estoque: confirmação (já no componente); ao salvar, as combinações
  que deixaram de existir são apagadas do banco.
- Nomes: tipo sem nome é recusado; opções repetidas no mesmo tipo (sem diferenciar
  maiúscula) são recusadas; até 30 opções por tipo; até 2 tipos.
- Estoque: inteiro de 0 a 1.000.000; o banco também não aceita negativo.
- Produto que já existia sem estoque (criado na B16-05): abre com estoque 0 na
  combinação única.
- Combinação sem linha no banco conta como 0.

### Cenário de Erro
- Falha ao gravar o estoque: o produto não fica pela metade — tipos e estoque são
  gravados por uma função do banco numa transação só (`salvar_estoque_produto`).

## Banco de Dados

- `catalog_products.variant_types` (jsonb, lista de `{ id, nome, opcoes[] }`, padrão `[]`)
- Tabela nova `catalog_stock`: `workspace_id`, `product_id` (cascade), `combination`
  (texto, "" sem variação), `quantity` (int ≥ 0), chave `(product_id, combination)`
- RLS igual à dos produtos (membros leem; Admin e Gerente escrevem)
- Função `salvar_estoque_produto(produto, tipos, estoque)` (security invoker: respeita o
  RLS de quem chama) — grava tipos, apaga combinações que saíram e grava as quantidades
- Migration: `supabase/migrations/20261003000007_catalogo_estoque.sql` (só acrescenta;
  pode ir antes do deploy)

## Arquivos

- **Criar:** `supabase/migrations/20261003000007_catalogo_estoque.sql`
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — carregar/salvar tipos e estoque; estoque total na lista
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — `comEstoque` ligado
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/editor-client.tsx` — `comVariacoes` ligado
- **Modificar:** `src/lib/catalogo/regras.ts` — limites de variação (opções por tipo, estoque máximo)
- **Modificar:** `src/test/catalogo-produtos.integration.test.ts` — casos da B16-06

## Checklist

- [x] Migration aplicada
- [x] Salvar e carregar tipos e estoque (transação no banco)
- [x] Validações no servidor
- [x] Lista com estoque total e Esgotado; editor com a grade
- [x] Testes de integração (13/13, 5 novos)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (03/10: grade P/M × Azul/Preto, 7 em estoque na lista, valores voltam ao reabrir, Esgotado ao zerar)
- [ ] Commit + push; deploy Ready
