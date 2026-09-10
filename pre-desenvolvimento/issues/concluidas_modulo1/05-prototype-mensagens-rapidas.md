# 05: Protótipo — Mensagens Rápidas

**Tipo:** Protótipo
**Página:** Mensagens Rápidas

## Descrição

Criar a página de configuração de mensagens rápidas com lista (título e preview), botão de criar, e ações de editar e excluir por mensagem — tudo com dados mock, sem integração backend. Inclui também o seletor no painel de conversa (botão Zap, busca por título, preenche o campo de texto).

## Cenários

### Happy Path — Config Page
1. Admin acessa `/configuracoes/mensagens-rapidas` pelo link na nav
2. Vê a lista com 5 mensagens rápidas iniciais, cada uma com título (atalho) e preview do conteúdo
3. Clica em "Nova mensagem", preenche título e conteúdo
4. Confirma — a mensagem aparece no final da lista
5. Clica em `⋯` de uma mensagem, escolhe "Editar" — dialog abre com título e conteúdo preenchidos
6. Altera e salva — lista atualiza
7. Clica em "Excluir" — dialog de confirmação; ao confirmar, remove da lista

### Happy Path — Seletor no Chat
1. Usuário está em uma conversa e clica no botão Zap (⚡) no input
2. Um painel abre acima da barra de input com campo de busca e lista de mensagens rápidas
3. Usuário digita parte do título ou conteúdo — lista filtra em tempo real
4. Usuário clica em uma mensagem — o conteúdo preenche o textarea e o painel fecha
5. Usuário pode editar o conteúdo antes de enviar

### Edge Cases
- Tentar salvar mensagem com título ou conteúdo vazio: botão "Salvar" desabilitado
- Lista da config page vazia: exibe mensagem "Nenhuma mensagem rápida cadastrada"
- Seletor com busca sem resultados: exibe "Nenhuma mensagem encontrada"
- Clicar no botão Zap novamente com seletor aberto: fecha o seletor

### Cenário de Erro
- Protótipo sem backend: mutações são locais em `useState`. A config page e o seletor do chat leem do mesmo mock estático — alterações na config page não refletem no seletor do chat durante a mesma sessão.

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Criar:** `src/app/(auth)/chat/mock-mensagens-rapidas.ts` — mock data compartilhado (5 mensagens rápidas iniciais)
- **Criar:** `src/app/(auth)/configuracoes/mensagens-rapidas/page.tsx` — página de configuração (client component: lista, dialogs criar/editar/excluir)
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — ativar botão Zap; adicionar estado e UI do seletor acima da barra de input
- **Modificar:** `src/app/(auth)/layout.tsx` — adicionar link "Mensagens Rápidas" na nav após "Etiquetas"

## Dependências Externas

Nenhuma nova. Reutilizar:
- `Dialog`, `DialogPopup`, `DialogTitle`, `DialogClose` de `@/components/ui/dialog`
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` de `@/components/ui/dropdown-menu`
- `Button` de `@/components/ui/button`
- `Input` de `@/components/ui/input`
- `Label` de `@/components/ui/label`
- `cn` de `@/lib/utils`
- Ícones `MoreHorizontal`, `Plus`, `Zap`, `Search`, `X` de `lucide-react`

## Checklist

- [x] Criar `mock-mensagens-rapidas.ts` com tipo `MensagemRapida` e array `MOCK_MENSAGENS_RAPIDAS` (5 atalhos realistas para atacadistas)
- [x] Criar `configuracoes/mensagens-rapidas/page.tsx` como Client Component: lista com título + preview truncado, dialogs criar/editar/excluir, validação (título e conteúdo não vazios), estado vazio
- [x] Em `painel-conversa.tsx`: importar `MOCK_MENSAGENS_RAPIDAS`; adicionar estados `seletorMRAberto` e `termoBuscaMR`; ativar o botão Zap (remover `disabled`)
- [x] Seletor de mensagens rápidas: painel condicional acima da barra de input com campo de busca, lista filtrada por título/conteúdo, clique preenche `texto` e fecha o seletor
- [x] Clicar no botão Zap com seletor já aberto fecha o seletor (toggle)
- [x] Adicionar link "Mensagens Rápidas" em `layout.tsx` após "Etiquetas"
