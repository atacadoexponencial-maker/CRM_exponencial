# B16-10: Pedidos no CRM e no perfil do contato

**Tipo:** Implementação
**Página:** Pedidos (`/catalogo/pedidos`), Perfil do contato, Menu do CRM
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Pedidos" (menos a baixa de estoque) e "Perfil do contato"
**Depende de:** B16-09 e B16-04 aprovado

## Descrição

Lista de pedidos com filtros e busca, detalhe com itens e histórico de situação, troca
manual de situação, links para o perfil e a conversa, contador de Novos no menu, e a seção
"Pedidos do catálogo" com o evento na linha do tempo do contato. Todos os papéis.

## Pronto quando

Em produção, o pedido feito pela vitrine aparece na lista e no contador de Novos; um
Atendente abre o detalhe, muda para Em atendimento, e o pedido aparece no perfil do
contato com o evento na linha do tempo.

## Cenários

### Happy Path
1. `/catalogo/pedidos` (todos os papéis): lista dos pedidos reais da empresa, do mais novo
   para o mais antigo, com filtros e busca (componentes da B16-04).
2. Escolher um pedido abre o detalhe (itens com foto, cliente, links para o perfil e a
   conversa, histórico com quem mudou e quando). O endereço `?pedido=<id>` abre direto um
   pedido (usado pelo perfil do contato).
3. Mudar a situação: Novo → Em atendimento → Fechado, ou Cancelado, por uma função do
   banco que confere a empresa de quem chama e se a mudança é permitida, e grava o
   histórico com quem mudou.
4. Menu: Admin/Gerente veem **Catálogo** com o número de pedidos **Novos**; Atendente vê
   **Pedidos** (só essa tela do catálogo) com o mesmo número.
5. Perfil do contato: seção **Pedidos do catálogo** (só aparece quando o contato tem pedido) e o evento "Pedido #N recebido pelo
   catálogo" na linha do tempo (com filtro próprio).

### Edge Cases
- Atendente na tela de Pedidos: abas Produtos/Aparência/Configurações não aparecem.
- Conversa: o link abre a conversa mais recente do contato (`/chat?conversa=<id>`); sem
  conversa, o botão não aparece.
- Produto excluído depois do pedido: o item continua com nome, variação, preço e foto da
  época, marcado "produto excluído".
- Mudança não permitida (ex.: de Cancelado para Novo) ou pedido de outra empresa: o
  banco recusa e a tela mostra o erro.
- Estoque ao fechar/cancelar é da B16-11: nesta issue o aviso de estoque insuficiente já
  aparece (comparando com o estoque atual), mas o estoque ainda não muda.
- Lista limitada aos 500 mais recentes.

### Cenário de Erro
- Falha ao mudar a situação: mensagem no detalhe; a situação mostrada não muda.

## Banco de Dados

- Função `mudar_situacao_pedido_catalogo(p_pedido, p_para)` (security definer, confere
  `auth.uid()`: pedido da empresa de quem chama, transição permitida); grava a situação e
  o evento com `changed_by`
- Migration: `supabase/migrations/20261003000011_catalogo_situacao_pedido.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261003000011_catalogo_situacao_pedido.sql`
- **Criar:** `src/app/(auth)/catalogo/pedidos/actions.ts` — listar, carregar detalhe, mudar situação, contar Novos
- **Criar:** `src/app/(auth)/catalogo/pedidos/page.tsx` + `pedidos-client.tsx`
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — aba Pedidos ativa; abas do Atendente
- **Modificar:** `src/app/(auth)/layout.tsx` + `src/components/shared/sidebar-nav.tsx` — contador de Novos; item Pedidos para Atendente
- **Modificar:** `src/app/(auth)/contatos/actions.ts`, `contatos/mock-contatos.ts`, `contatos/[id]/components/perfil-contato.tsx`, `contatos/[id]/components/timeline-contato.tsx` — seção e evento de pedidos
- **Apagar:** `src/app/(auth)/catalogo/prototipo/` — último protótipo do catálogo sai
- **Criar:** `src/test/catalogo-pedidos-crm.integration.test.ts` — lista por empresa, Atendente vê e muda situação, transições, histórico com quem mudou, outra empresa não mexe, perfil com os pedidos

## Checklist

- [x] Migration aplicada
- [x] Lista e detalhe reais; `?pedido=` abre direto
- [x] Mudança de situação pela função do banco, com histórico
- [x] Contador no menu; item Pedidos do Atendente
- [x] Perfil do contato com seção e evento
- [x] Protótipo removido
- [x] Testes de integração (6/6 em `catalogo-pedidos-crm.integration.test.ts`; testes antigos de contatos 23/23)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (Admin e Atendente) (03/10: pedido feito pela loja aparece com contador "Catálogo 1", histórico com quem mudou, perfil com seção, link e evento; Atendente vê só Pedidos e muda a situação)
- [x] Commit + push (`b4fceb5`); deploy Ready (03/10)
