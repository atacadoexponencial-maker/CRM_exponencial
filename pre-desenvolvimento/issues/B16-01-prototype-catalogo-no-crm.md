# B16-01: Protótipo — Catálogo no CRM (produtos, editor, configurações)

**Tipo:** Protótipo
**Página:** Menu do CRM, Produtos (`/catalogo`), Editor de produto, Configurações do catálogo
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Produtos", "Editor de produto", "Configurações do catálogo" e "Menu do CRM"

## Descrição

Telas do catálogo dentro do CRM com dados de exemplo e sem gravar nada: item Catálogo no
menu, lista de produtos com categorias, editor de produto (fotos, variações, grade de
estoque) e configurações (endereço, número, pedido mínimo, publicar).

## Pronto quando

No CRM publicado, a Marcelle navega pelo item Catálogo e vê a lista, o editor e as
configurações preenchidos com produtos de exemplo, sem nada ser gravado, e aprova ou
pede ajustes no visual antes da implementação.

## Cenários

### Happy Path
1. Admin ou Gerente vê o item **Catálogo** no menu (seção principal, depois de Contatos)
   e chega a `/catalogo/prototipo`, com a faixa "Protótipo (B16-01): dados de exemplo,
   nada é gravado" (mesmo padrão do protótipo da B11).
2. Abas do catálogo no topo: **Produtos**, **Aparência**, **Configurações**, **Pedidos**
   (Aparência e Pedidos aparecem desabilitadas, "nos próximos protótipos").
3. **Produtos**: busca, filtro de categoria, filtro visíveis/ocultos, botão Novo produto,
   link Ver minha loja (desabilitado no protótipo); lista com foto, nome, categoria,
   preço, estoque total, selos Oculto e Esgotado; ocultar/mostrar com um clique;
   painel de categorias com criar, renomear, excluir (com confirmação) e reordenar
   arrastando; reordenar produtos dentro da categoria arrastando. Estado vazio
   alcançável por um botão "Ver sem produtos" na faixa do protótipo.
4. **Editor** (`/catalogo/prototipo/produto` e `?novo=1`): campos, fotos (escolher
   arquivos mostra as miniaturas no aparelho, sem enviar; reordenar; remover), variações
   (até 2 tipos), grade de estoque por combinação gerada das opções, visível/destaque,
   Salvar (só valida e mostra "Salvo no protótipo"), Excluir (confirmação).
5. **Configurações** (`/catalogo/prototipo/configuracoes`): endereço com prévia do link e
   "disponível"/"em uso" simulado, Copiar link, número (lista de exemplo), pedido mínimo
   (Sem mínimo / N peças / R$ X), mensagem de fechamento, Publicar — que explica o que
   falta quando endereço ou número estão vazios.

### Edge Cases
- Salvar sem nome ou com preço vazio/zero: erro no campo.
- Foto com formato errado ou acima de 5 MB: erro sem miniatura; mais de 8 fotos: aviso.
- Remover opção de variação com estoque: pede confirmação.
- Terceiro tipo de variação: botão some ao chegar em 2.
- Endereço com maiúscula/espaço/acento: normaliza ou mostra o erro.
- Atendente: o item Catálogo não aparece e a rota do protótipo manda para `/perfil`
  (a página de Pedidos para Atendente é da B16-04/B16-10).
- Tema sempre escuro: nada de fundo claro sem cor de texto.

### Cenário de Erro
- Sem banco: nada pode falhar ao gravar. As interações vivem só no estado da página;
  recarregar volta aos dados de exemplo.

## Arquivos

- **Criar:** `src/app/(auth)/catalogo/components/abas-catalogo.tsx` — abas Produtos/Aparência/Configurações/Pedidos (reaproveitada nas próximas)
- **Criar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — barra de topo, lista, selos, ocultar/mostrar, reordenar, estado vazio (apresentacional; dados e ações por props)
- **Criar:** `src/app/(auth)/catalogo/components/painel-categorias.tsx` — criar, renomear, excluir, reordenar categorias (apresentacional)
- **Criar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — campos, fotos, visível/destaque, validação, salvar/excluir (apresentacional)
- **Criar:** `src/app/(auth)/catalogo/components/variacoes-estoque.tsx` — tipos de variação, opções e grade de estoque (apresentacional; base da B16-06)
- **Criar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — endereço, número, mínimo, mensagem, publicar (apresentacional; base da B16-07)
- **Criar:** `src/app/(auth)/catalogo/prototipo/dados-exemplo.ts` — produtos, categorias e números de exemplo
- **Criar:** `src/app/(auth)/catalogo/prototipo/page.tsx` + `prototipo-produtos-client.tsx` — rota temporária da lista (sai na B16-05)
- **Criar:** `src/app/(auth)/catalogo/prototipo/produto/page.tsx` + `prototipo-editor-client.tsx` — rota temporária do editor (sai na B16-05)
- **Criar:** `src/app/(auth)/catalogo/prototipo/configuracoes/page.tsx` + `prototipo-configuracoes-client.tsx` — rota temporária das configurações (sai na B16-07)
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item Catálogo (Admin e Gerente) apontando para o protótipo

> Reuso: `Button`, `Input`, `Label`, `Badge`, `Dialog` de `src/components/ui`; arrastar
> com o drag nativo, como o quadro do pipeline; padrão visual das telas de configuração
> (`etiquetas-client.tsx`); a faixa de protótipo como na B11-01.

## Checklist

- [x] Item Catálogo no menu para Admin e Gerente
- [x] Abas do catálogo
- [x] Lista de produtos com busca, filtros, selos, ocultar/mostrar, reordenar e estado vazio
- [x] Painel de categorias (criar, renomear, excluir com confirmação, reordenar)
- [x] Editor de produto com validação, fotos locais, variações e grade de estoque
- [x] Configurações com endereço, copiar link, número, mínimo, mensagem e publicar
- [x] Atendente sem acesso
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: `next start` + Playwright, capturas das três telas (03/10: 20 verificações; Atendente redirecionado para /perfil; workspaces temporários apagados)
- [x] Commit + push (`d6e45c4`); deploy Ready; link do protótipo para a Marcelle (03/10) — falta a aprovação dela
