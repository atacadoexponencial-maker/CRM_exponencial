# B36-08: Contatos no estilo Caderno

**Tipo:** Implementação
**Página:** /contatos, /contatos/[id] e /contatos/lixeira
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar a lista de contatos, o perfil do contato e a lixeira na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

As três telas de contatos seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-30** (manual) — Contatos aprovados visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre a lista, um perfil e a lixeira, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- Lista de contatos com o título do Caderno, busca e ordenação na superfície, a contagem e a tabela em livro-caixa (linha grossa em cima, linhas finas entre os contatos, cabeçalho discreto, WhatsApp em fonte de número).
- O botão de excluir de cada linha fica discreto e só fica vermelho ao passar o mouse.
- Perfil do contato e lixeira com o título e as margens do Caderno; avisos de erro no tom de erro do tema.

### Edge Cases
- Filtros, ordenação, paginação, exclusão, restauração, registrar compra, tags, observações e timeline continuam iguais.

### Cenário de Erro
- Mensagens de erro de formulário e de ação no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-30 | manual | roteiro abaixo | a lista, o perfil e a lixeira seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-30
1. Abra o preview e entre com a empresa de teste.
2. Em Contatos, busque um nome, troque a ordenação e use um filtro de classificação.
3. Abra um contato: confira os dados, as compras, as tags, as observações e a timeline; registre uma compra de teste.
4. Exclua um contato de teste, abra a Lixeira e restaure.
5. Repita no tema escuro.
6. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/[id]/components/registrar-compra-dialog.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/components/dialogo-excluir-contato.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — tabela em livro-caixa, busca na superfície, excluir discreto, WhatsApp em fonte de número
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/lixeira/components/lista-lixeira.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/lixeira/lixeira-client.tsx` — título, margens, tabela e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/contatos/loading.tsx` — título, margens, tabela e avisos no estilo Caderno

## Checklist

- [x] Título e margens do Caderno
- [x] Tabelas em livro-caixa com cabeçalho discreto
- [x] Avisos de erro no tom do tema
- [x] Ações de excluir discretas
