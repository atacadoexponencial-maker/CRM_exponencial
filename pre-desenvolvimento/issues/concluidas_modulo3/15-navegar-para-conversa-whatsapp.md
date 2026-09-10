# 15: Navegar para Conversa no WhatsApp

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Usuário clica em "Abrir conversa" no Perfil do Contato e é redirecionado para a conversa de WhatsApp do contato no módulo de Chat.

## Cenários

### Happy Path
1. Usuário abre o perfil de um contato que possui conversa no WhatsApp
2. Clica em "Abrir conversa"
3. É redirecionado para `/chat?conversa=<id>`, que abre a conversa diretamente
4. O chat já existe no banco (`conversations` vinculado ao `contact_id`)

### Edge Cases
- Contato sem nenhuma conversa: botão direciona para `/chat` (caixa de entrada sem conversa selecionada)
- Contato com múltiplas conversas: usa a mais recente (`last_message_at` desc)

### Cenário de Erro
- Não há cenário de erro — é uma navegação simples via `<Link>`

## Banco de Dados

Leitura da tabela existente:
- Tabela: `conversations`
  - `id` — ID da conversa a ser usada no parâmetro `?conversa=<id>`
  - `contact_id` — usado para filtrar a conversa do contato

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — adicionar campo `conversaId: string | null` ao tipo `ContatoPerfil`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — buscar `conversations.id` mais recente do contato em `buscarDadosContato` e incluí-lo no retorno
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — substituir `<Button>` placeholder de "Abrir conversa" por `<Link href={conversaId ? \`/chat?conversa=${conversaId}\` : "/chat"}>` com estilo de botão

## Checklist

- [x] `mock-contatos.ts`: adicionar `conversaId: string | null` ao tipo `ContatoPerfil` e aos mocks existentes
- [x] `actions.ts`: buscar `conversations` por `contact_id`, pegar o mais recente, incluir `conversaId` no retorno de `buscarDadosContato`
- [x] `perfil-contato.tsx`: substituir o `<Button>` de "Abrir conversa" por `<Link>` navegando para `/chat?conversa=<id>` (ou `/chat` se não houver conversa)
