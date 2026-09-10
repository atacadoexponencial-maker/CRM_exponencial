# 34: Visualizar Informações do Contato

**Tipo:** Implementação
**Página:** Contato Básico

## Descrição

Implementar o carregamento e exibição das informações básicas do contato no painel lateral: nome, número de WhatsApp, data do primeiro contato e etiquetas aplicadas — buscando os dados do Supabase ao abrir o painel.

## Cenários

### Happy Path
1. Usuário abre uma conversa e clica no nome do contato no cabeçalho
2. O painel lateral abre mostrando nome e telefone (dados já disponíveis na conversa)
3. Um skeleton/spinner aparece brevemente enquanto busca: data do primeiro contato e conversas anteriores
4. Após a busca, exibe: data real do primeiro contato (`contacts.created_at`) e lista de conversas anteriores do mesmo contato
5. Etiquetas ficam vazias (tabela de etiquetas ainda não existe)

### Edge Cases
- Contato sem nome: exibe o telefone; campo de edição começa vazio
- Contato sem conversas anteriores: exibe "Nenhuma conversa anterior"
- Contato sem etiquetas: seção de etiquetas não é renderizada

### Cenário de Erro
- Falha na busca do Supabase: exibe mensagem de erro discreto no lugar do skeleton; nome e telefone continuam visíveis pois vêm da prop `conversa`

## Banco de Dados (se aplicável)

- Tabela: `contacts`
  - `id` (uuid) — usado para buscar conversas anteriores do mesmo contato
  - `created_at` (timestamptz) — data do primeiro contato (correto a usar aqui; `page.tsx` usa incorretamente `conversations.created_at`)
- Tabela: `conversations`
  - `contact_id` (uuid) — filtro para buscar conversas do mesmo contato
  - `status`, `last_message_text`, `last_message_at` — exibidos na lista de conversas anteriores

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `buscarInfoContato(conversaId: string)` que retorna `{ dataPrimeiroContato, etiquetas, conversasAnteriores }`
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — remover prop `todasConversas`; adicionar prop `conversaId`; buscar dados do Supabase ao montar via `buscarInfoContato`; exibir loading enquanto busca
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — remover import de `MOCK_CONVERSAS`; atualizar chamada de `<PainelContato>` retirando `todasConversas` e passando `conversaId={conversa.id}`

## Dependências Externas

Nenhuma nova dependência. Reutilizar:
- `createClient` de `@/integrations/supabase/server` (padrão já usado em `actions.ts`)
- `useTransition` do React (padrão já usado em `chat-layout.tsx`)

## Checklist

- [x] Adicionar `buscarInfoContato(conversaId: string)` em `actions.ts`: busca `conversations JOIN contacts` para obter `contact_id` e `contacts.created_at`; busca outras conversas do mesmo `contact_id` (`status`, `last_message_text`, `last_message_at`); retorna `{ dataPrimeiroContato: string, etiquetas: [], conversasAnteriores: Array<{ id, status, ultimaMensagemTexto, ultimaMensagemHorario }> }`
- [x] Remover prop `todasConversas: Conversa[]` de `PainelContatoProps` em `painel-contato.tsx`
- [x] Adicionar prop `conversaId: string` em `PainelContatoProps` em `painel-contato.tsx`
- [x] Adicionar estado local `infoContato` (com dados buscados) e `carregandoInfo` em `painel-contato.tsx`
- [x] Chamar `buscarInfoContato(conversaId)` via `useTransition` no `useEffect` ao montar em `painel-contato.tsx`
- [x] Substituir `conversa.dataPrimeiroContato` pelo valor de `infoContato.dataPrimeiroContato` (com skeleton enquanto `carregandoInfo`) em `painel-contato.tsx`
- [x] Substituir `conversasAnteriores` derivadas de `todasConversas` por `infoContato.conversasAnteriores` (com skeleton enquanto `carregandoInfo`) em `painel-contato.tsx`
- [x] Remover import de `MOCK_CONVERSAS` e `todasConversas` de `painel-conversa.tsx`; passar `conversaId={conversa.id}` para `<PainelContato>`
