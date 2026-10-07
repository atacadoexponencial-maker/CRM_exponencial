# B17-01: Compra por grade na página do produto

**Tipo:** Implementação
**Página:** Página do produto na vitrine (`/loja/<endereço>/p/<produto>`), celular e computador
**Spec:** `pre-desenvolvimento/spec-compra-por-grade.md`

## Descrição

Trocar o seletor "escolha tamanho e cor + quantidade" pela grade de quantidades: todas as
combinações do produto aparecem de uma vez (um bloco por opção do 2º tipo, uma linha por
opção do 1º; uma lista só quando há um tipo), cada uma com −, quantidade digitável e +,
travadas no estoque, e um único botão "Adicionar N peças · R$ total" que manda tudo para o
carrinho e zera a grade. Inclui o resumo do mínimo da loja, o total por bloco, o bloco
esgotado recolhido, o botão fixo no rodapé no celular e o produto sem variação com o mesmo
botão.

Sem protótipo separado: a página já existe e a mudança não toca o servidor (o carrinho já
aceita uma linha por combinação). O protótipo seria o próprio componente com dados falsos —
a verificação visual é feita com capturas do componente real numa loja temporária.

## Pronto quando

Numa loja com um produto de 2 tipos (ex.: 3 tamanhos × 2 cores, uma combinação esgotada e
uma cor inteira esgotada), a cliente no celular monta 2 P + 2 M em Areia e 1 P em Preto sem
escolher nada antes, vê "Adicionar 5 peças · R$ …" no rodapé, adiciona e encontra as 3
linhas no carrinho; a grade volta a zero e os limites descontam o que foi para o carrinho.
Produto de 1 tipo mostra uma lista só; produto sem variação mantém uma quantidade.
Nenhuma largura de tela rola para o lado.

## Cenários

### Happy Path
1. A cliente abre um produto com Tamanho (P, M, G) e Cor (Areia, Preto).
2. Vê o resumo do mínimo da loja e dois blocos, "Cor: Areia" e "Cor: Preto", com as linhas P, M e G zeradas.
3. Toca + duas vezes em Areia P e em Areia M. Depois digita 1 em Preto P.
   - O título do bloco mostra "4 peças" em Areia e "1 peça" em Preto.
   - O rodapé mostra "Adicionar 5 peças · R$ 449,50".
4. Toca em Adicionar.
   - O carrinho recebe 3 linhas, "P / Areia", "M / Areia" e "P / Preto", numa única gravação.
   - O contador do topo vai para 5.
   - Aparece o aviso "5 peças adicionadas · Ver carrinho".
   - Todas as quantidades da grade voltam a zero.

### Edge Cases
- **Combinação sem estoque:** a linha aparece riscada, com "esgotado", e os botões −, + e o campo ficam travados.
- **Todo o estoque já no carrinho:** a linha fica travada, com "todas já no carrinho".
- **Todas as combinações de uma cor esgotadas:** o bloco aparece recolhido numa linha, "Preto · esgotado".
- **Produto inteiro esgotado:** em vez da grade, aparece "Produto esgotado no momento", como hoje.
- **Produto com um tipo só:** aparece uma lista única, com o nome do tipo como título.
- **Produto sem variação:** aparece uma quantidade só, mínimo 1, e o mesmo botão "Adicionar N peças · R$ total".
- **Quantidade digitada acima do disponível:** vira o máximo disponível.
- **Quantidade digitada vazia, inválida ou negativa:** vira 0.
- **Restam poucas peças:** com 5 ou menos disponíveis, a linha mostra "N disponíveis", ou "1 disponível" no singular.
- **Loja sem pedido mínimo:** o resumo do mínimo não aparece.
- **Sair da página sem adicionar:** a grade se perde e o carrinho não muda.
- **Ordem das opções:** blocos e linhas seguem a ordem cadastrada pela lojista.

### Cenário de Erro
- **Estoque mudou depois que a página abriu:** a grade usa o estoque da hora em que a página carregou. Se a cliente pedir mais do que existe agora, o servidor recusa no momento do pedido, como já faz hoje (`registrarPedido` com `semEstoque`), e o carrinho ajusta os limites. Nada novo no servidor.
- **Botão Adicionar sem nada escolhido:** mostra "Escolha as quantidades" e fica desabilitado.

## Banco de Dados

Sem mudança. O carrinho já guarda uma linha por combinação.

## Arquivos

- **Criar:** `src/lib/catalogo/grade.ts`
  - Funções puras da grade:
    - `blocosDaGrade(tipos)`: monta os blocos e as linhas na ordem cadastrada. Com 2 tipos, um bloco por opção do 2º tipo e uma linha por opção do 1º. Com 1 tipo, um bloco só. Sem tipo, nenhum bloco.
    - `limitarQuantidade(texto | número, disponível)`: aplica o limite entre 0 e o disponível.
    - `totaisDaGrade(quantidades, preço)`: devolve peças e valor.
  - A chave de cada linha vem do `chaveCombinacao` de `combinacoes.ts`, para casar com o estoque e o carrinho.
- **Criar:** `src/app/loja/components/grade-quantidades.tsx`
  - Componente que só desenha: blocos, linhas com −, campo e +, linha esgotada, bloco recolhido e total do bloco.
  - Recebe por props as quantidades, o disponível por combinação e `onMudar(combinação, quantidade)`.
  - Os rótulos acessíveis seguem o formato "Aumentar Areia, M".
- **Modificar:** `src/app/loja/components/pagina-produto.tsx`
  - Sai o seletor de opções (`escolhas`, `opcaoIndisponivel`, `escolher`) e a quantidade única do produto com variação.
  - Entram o estado das quantidades por combinação e a `GradeQuantidades`.
  - Novas props: `avisoMinimo` e `onAdicionar(itens: { combinacao, quantidade }[])`. O formato da prop `onAdicionar` muda.
  - O botão Adicionar fica fixo no rodapé no celular e embaixo da grade no computador.
  - Entram o aviso "N peças adicionadas" e a grade voltando a zero.
  - O produto sem variação mantém a quantidade única, mas com o novo botão.
- **Modificar:** `src/app/loja/components/carrinho-local.ts`
  - Nova função `adicionarVarios(novos: { item, quantidade }[])`, que grava tudo de uma vez.
  - Chamar `adicionar` em sequência não serve: cada chamada parte da mesma leitura do carrinho e sobrescreve a anterior.
  - O `adicionar` atual continua existindo.
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx`
  - Passa `avisoMinimo={textoDoMinimo(minimo)}`, que vem de `pedido.ts`, já usado na vitrine.
  - Passa o novo `onAdicionar`, que monta os itens e chama `carrinho.adicionarVarios`.
- **Criar:** `src/test/catalogo-grade.test.ts`
  - Testes de unidade de `grade.ts`: blocos com 2, 1 e 0 tipos; limite da quantidade digitada; totais.

Reutilizar:
- `chaveCombinacao` e `combinacoes` de `src/lib/catalogo/combinacoes.ts`;
- `textoDoMinimo` de `src/app/loja/components/pedido.ts`;
- `formatarPreco` de `lista-produtos`, já usado na página;
- `coresDaVitrine` e `familiaDaFonte`, que já estão na página.

## Checklist

- [x] `grade.ts` com `blocosDaGrade`, `limitarQuantidade` e `totaisDaGrade`
- [x] `GradeQuantidades`:
  - [x] blocos e linhas em ordem
  - [x] −, campo digitável e + travados no disponível
  - [x] linha esgotada riscada, com o motivo
  - [x] bloco esgotado recolhido
  - [x] total do bloco
  - [x] rótulos acessíveis e alvos de 44px
- [x] `PaginaProduto`:
  - [x] grade no lugar do seletor
  - [x] resumo do mínimo
  - [x] botão "Adicionar N peças · R$ total", fixo no rodapé no celular
  - [x] aviso "N peças adicionadas · Ver carrinho"
  - [x] grade volta a zero e os limites descontam o carrinho
- [x] Produto sem variação com o novo botão (quantidade mínima 1)
- [x] `adicionarVarios` no carrinho local, gravando tudo de uma vez
- [x] `produto-client.tsx` passa o mínimo e o novo `onAdicionar`
- [x] Testes de unidade de `grade.ts` passando
- [x] Verificação no navegador, com loja temporária no celular e no computador:
  - [x] montar a grade do "Pronto quando" e conferir as 3 linhas no carrinho
  - [x] produto de 1 tipo e produto sem variação
  - [x] sem rolagem lateral
  - [x] capturas conferidas
- [x] Lint e tipos sem erro
