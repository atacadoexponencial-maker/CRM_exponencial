# B36-09: Catálogo no estilo Caderno

**Tipo:** Implementação
**Página:** /catalogo e subtelas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar as telas internas do catálogo (produtos, produto, aparência, configurações, importar e pedidos) na linguagem Caderno, sem mexer na loja pública.

## Pronto quando

As telas internas do catálogo seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-31** (manual) — Catálogo aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre as telas do catálogo e os pedidos, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- As telas internas do catálogo (produtos, produto, aparência, configurações, importar e pedidos) ganham o título e as margens do Caderno, as caixas na superfície do tema, as tabelas em livro-caixa e os números em fonte de número.
- A prévia da loja na tela Aparência continua com as cores da própria loja.

### Edge Cases
- A loja pública não muda (fica fora desta issue e é sempre clara, B36-01).
- Ordenar categorias, editar produto, importar planilha e mudar a situação do pedido continuam iguais.

### Cenário de Erro
- Mensagens de erro no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-31 | manual | roteiro abaixo | as telas internas do catálogo e os pedidos seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-31
1. Abra o preview e entre com a empresa de teste.
2. Em Catálogo, confira Produtos, abra um produto, mude e desfaça um preço.
3. Abra Aparência (a prévia da loja continua com as cores da loja), Configurações e Importar.
4. Abra Pedidos.
5. Abra a loja pública pelo link "Ver minha loja" e confira que ela está igual a antes.
6. Repita no tema escuro.
7. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/catalogo/aparencia/aparencia-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/abas-catalogo.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/lista-pedidos.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/painel-categorias.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/previa-importacao.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/secao-pedidos-contato.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/components/variacoes-estoque.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/configuracoes/configuracoes-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/pedidos/pedidos-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/editor-client.tsx` — título, margens, caixas, tabelas e números no estilo Caderno

## Checklist

- [x] Título e margens do Caderno
- [x] Caixas na superfície e tabelas em livro-caixa
- [x] Números em fonte de número
- [x] Avisos de erro no tom do tema
