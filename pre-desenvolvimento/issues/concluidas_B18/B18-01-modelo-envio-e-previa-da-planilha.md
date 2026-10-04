# B18-01: Modelo, envio e prévia da planilha

**Tipo:** Implementação
**Página:** Lista de produtos (`/catalogo`) e página de importação (`/catalogo/importar`)
**Spec:** `pre-desenvolvimento/spec-importar-produtos.md`

## Descrição

Botão "Importar planilha" na lista de produtos e a página de importação com os passos 1 a 3:
- baixar o modelo;
- ver como preencher;
- enviar o arquivo (Excel ou .csv);
- ler e conferir cada linha no servidor;
- mostrar a prévia: novos e atualizados com o que muda, e os erros por linha.

Nada é gravado nesta issue. O botão "Importar N produtos" aparece, mas a gravação é da B18-02.

Não há issue de protótipo separada. A página é montada direto com a leitura real da planilha, porque um protótipo com dados falsos seria a mesma tela.

## Pronto quando

A lojista baixa o modelo, preenche e envia.

A prévia mostra:
- quantos produtos são novos e quantos atualizam produtos do catálogo, com os campos que mudam;
- os erros com o número da linha.

Os erros cobrem:
- preço inválido;
- coluna obrigatória faltando;
- combinação repetida;
- variações que não batem com as do produto existente;
- código repetido no catálogo.

Arquivo de formato errado, grande demais ou vazio mostra a mensagem certa.

O Atendente não vê o botão e não abre a página.

## Cenários

### Happy Path
1. Admin ou Gerente toca em "Importar planilha" na lista de produtos.
2. Em `/catalogo/importar`, toca em "Baixar modelo" e recebe `modelo-produtos.xlsx`. O arquivo tem duas abas:
   - "Produtos": o cabeçalho e 4 linhas de exemplo;
   - "Como preencher": uma linha por coluna.
3. Preenche e envia o arquivo. O servidor lê, confere cada linha e compara com o catálogo pelo código.
4. A prévia mostra:
   - o resumo "N novos · M atualizados · K com erro";
   - a lista de produtos com o selo "Novo" ou "Atualiza" e o que muda;
   - os erros com a linha.

### Edge Cases
- **Excel e CSV:** aceita `.xlsx`, `.xls` e `.csv`. O CSV pode vir separado por vírgula (Google Planilhas) ou por ponto e vírgula (Excel em português), em UTF-8.
- **Cabeçalho:** reconhecido pelo nome, sem diferenciar maiúscula, minúscula e acento, e em qualquer ordem. Colunas desconhecidas são ignoradas.
- **Linhas em branco:** são puladas, mas a numeração continua sendo a da planilha (cabeçalho = linha 1).
- **Código:** se vier como número do Excel (ex.: 1001), vira o texto "1001".
- **Preço:** aceita `89,90`, `89.90`, `R$ 89,90`, `1.234,56` e o número da célula.
- **Visível:** aceita sim, não, s, n, true, false, 1 e 0. Vazio vale "sim" no produto novo e mantém o valor atual na atualização.
- **Estoque vazio:** vale 0 no produto novo e mantém o atual na atualização.
- **Produto existente:** é identificado pelo código (`sku`) dentro da empresa.
- **O que muda num produto existente:**
  - mostra antes → depois de nome, preço, preço de, categoria e visível;
  - "Descrição muda" quando a descrição é outra;
  - "Estoque X → Y" para o estoque total;
  - "N combinações novas" para combinações que ainda não existem;
  - "Fotos substituídas (N)" quando a coluna Fotos vem preenchida;
  - "Sem mudanças" quando nada muda.

### Cenário de Erro
- **Arquivo do tipo errado:** "Envie a planilha do Excel ou o arquivo .csv do Google Planilhas."
- **Acima de 4 MB:** "A planilha passa de 4 MB." **Acima de 1.000 linhas:** "A planilha passa de 1.000 linhas."
- **Coluna obrigatória faltando:** "Falta a coluna Preço. Use o modelo." Se faltarem várias, todas aparecem na mesma mensagem.
- **Sem nenhuma linha de produto:** "A planilha não tem nenhum produto."
- **Erros de linha** (o produto inteiro sai da importação):
  - código, nome ou preço vazio;
  - nome com mais de 120 caracteres;
  - preço que não é número ou não é maior que zero;
  - preço de que não é maior que o preço;
  - estoque que não é número inteiro entre 0 e 1.000.000;
  - "Visível na loja" com valor que não é sim ou não;
  - mais de 8 fotos, ou link que não começa com http;
  - Opção sem Variação, ou Variação sem Opção;
  - Variação 2 sem Variação 1;
  - nome de variação diferente entre linhas do mesmo produto;
  - combinação repetida;
  - produto sem variação com mais de uma linha;
  - mais de 30 opções num tipo de variação;
  - variações que não batem com as do produto existente;
  - código repetido no catálogo.
- **Sessão expirada ou Atendente:** a página redireciona, e a ação do servidor devolve o erro de sempre ("Só Admin e Gerente mexem no catálogo.").

## Banco de Dados

Sem mudança. Nesta issue a importação só lê `catalog_products` (sku, variant_types, catalog_stock) e `catalog_categories`.

## Arquivos

- **Criar:** `src/lib/catalogo/planilha.ts`
  - funções puras, sem banco: `COLUNAS_PLANILHA` (nome, obrigatória, o que vai, exemplo), `LINHAS_EXEMPLO`, `normalizarTexto`, `lerNumero`, `lerPreco`, `lerSimNao` e `interpretarPlanilha(matriz)`;
  - `interpretarPlanilha` devolve os produtos agrupados pelo código, os erros por linha e as colunas que faltam.
- **Criar:** `src/lib/catalogo/importacao.ts`
  - só no servidor: `lerArquivoPlanilha(nome, bytes)` usa a SheetJS e devolve a matriz de células;
  - `montarPrevia(supabase, workspaceId, produtos)` compara com o catálogo e devolve novos, atualizados, mudanças e os erros de código repetido e de variações.
- **Criar:** `src/app/(auth)/catalogo/importar/page.tsx`: página só para Admin e Gerente, com o mesmo cabeçalho e as mesmas abas do catálogo (aba Produtos ativa).
- **Criar:** `src/app/(auth)/catalogo/importar/importar-client.tsx`: os passos (modelo, envio com escolher ou arrastar, prévia) e o "Enviar outro arquivo".
- **Criar:** `src/app/(auth)/catalogo/importar/actions.ts`: `previaImportacao(formData)`, que confere a sessão, o tipo e o tamanho do arquivo, depois lê, interpreta e monta a prévia.
- **Criar:** `src/app/(auth)/catalogo/importar/modelo/route.ts`: GET que gera o `modelo-produtos.xlsx` com as abas "Produtos" e "Como preencher". Só para Admin e Gerente.
- **Criar:** `src/app/(auth)/catalogo/components/previa-importacao.tsx`: só desenha o resumo, a lista de produtos com as mudanças e os erros.
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx`: nova prop `hrefImportar` e botão "Importar planilha" na barra de ferramentas e no estado vazio.
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx`: passa `hrefImportar="/catalogo/importar"`.
- **Criar:** `src/test/catalogo-planilha.test.ts`: testes de unidade de `interpretarPlanilha` e dos leitores de preço, número e sim/não.
- **Criar:** `src/test/catalogo-importacao.integration.test.ts`: prévia contra o Supabase real. Cobre produto novo, atualização com mudanças, código repetido, variações que não batem, isolamento entre empresas e Atendente recusado.

## Dependências Externas

- `xlsx` (SheetJS CE 0.20.3), instalada pelo pacote oficial `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, como manda a documentação deles. Lê `.xlsx`, `.xls` e `.csv` e gera o modelo.

Reutilizar:
- `chaveCombinacao`, `combinacoes` e `MAX_TIPOS_VARIACAO` de `combinacoes.ts`;
- `ESTOQUE_MAXIMO` e `MAX_OPCOES_POR_TIPO` de `regras.ts`;
- `MAX_FOTOS`;
- `sessaoAtual`;
- `AbasCatalogo`, `HREFS_CATALOGO` e `ALVOS_TOQUE_CELULAR`;
- `formatarPreco`.

## Checklist

- [x] `planilha.ts` com colunas, exemplos, leitores e `interpretarPlanilha`
- [x] `importacao.ts` com `lerArquivoPlanilha` (Excel e CSV) e `montarPrevia`
- [x] Ação `previaImportacao`: sessão, tipo, tamanho e limite de linhas
- [x] Rota do modelo `.xlsx` com as duas abas
- [x] Página `/catalogo/importar`: modelo, "Como preencher", envio (escolher e arrastar) e prévia
- [x] Botão "Importar planilha" na lista e no estado vazio
- [x] Testes de unidade passando
- [x] Testes de integração passando
- [x] Verificação no navegador: baixar o modelo, enviá-lo preenchido e ver a prévia com novos, atualizados e erros
- [x] Lint e tipos sem erro
