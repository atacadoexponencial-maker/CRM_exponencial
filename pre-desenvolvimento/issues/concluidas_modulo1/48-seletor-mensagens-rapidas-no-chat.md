# 48: Abrir Seletor de Mensagens Rápidas no Chat

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o seletor de mensagens rápidas acessível pelo botão no campo de texto do chat: ao abrir, exibe a lista de todas as mensagens rápidas do workspace com título e preview do conteúdo.

## Cenários

### Happy Path
1. Qualquer usuário abre uma conversa e clica no botão Zap (⚡)
2. Seletor abre com campo de busca e lista de mensagens rápidas reais do workspace
3. Usuário filtra por título ou conteúdo
4. Clica em uma mensagem → conteúdo é inserido no campo de texto
5. Seletor fecha automaticamente

### Edge Cases
- Workspace sem mensagens rápidas: seletor exibe "Nenhuma mensagem encontrada"
- Seletor já existe e funciona — apenas substitui a fonte de dados (mock → Supabase)

### Cenário de Erro
- Falha no Supabase ao carregar `quick_replies`: `page.tsx` recebe `[]` — seletor exibe lista vazia sem quebrar

## Banco de Dados

- Tabela: `quick_replies`
  - SELECT: `id, title, content` filtrado por `workspace_id`

## Arquivos

- **Modificar:** `src/app/(auth)/chat/page.tsx` — adicionar query em `quick_replies` junto ao `labelsRows`; passar `mensagensRapidas` para `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — aceitar prop `mensagensRapidas: Array<{ id, titulo, conteudo }>`; repassar para `PainelConversa`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — aceitar prop `mensagensRapidas`; substituir `MOCK_MENSAGENS_RAPIDAS` pela prop; remover import de `mock-mensagens-rapidas`

## Checklist

- [x] Atualizar `page.tsx`: buscar `quick_replies` (id, title, content) por workspace; passar `mensagensRapidas` para `ChatLayout`
- [x] Atualizar `chat-layout.tsx`: aceitar e repassar prop `mensagensRapidas` para `PainelConversa`
- [x] Atualizar `painel-conversa.tsx`: aceitar prop `mensagensRapidas`; remover import de `mock-mensagens-rapidas`; usar a prop no seletor
