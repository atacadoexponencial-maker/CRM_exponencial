# 11: Acessar conversa de WhatsApp pelo ícone do card

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar o ícone de atalho para conversa no card do kanban. Ao clicar no ícone, o usuário é redirecionado diretamente para a conversa de WhatsApp do contato no módulo de Chat (rota `/chat` com a conversa aberta).

## Cenários

### Happy Path
1. Usuário vê um card no kanban (Expansão ou Retenção)
2. Clica no ícone `MessageSquare` no canto superior direito do card (ou no botão "Abrir conversa" no `PainelCard`)
3. É navegado para `/chat?conversa=<conversaId>`
4. A página `/chat` carrega com a conversa do contato já aberta

### Edge Cases
- Card sem conversa associada (contato ainda não tem conversa no sistema): botão desabilitado visualmente, sem navegação
- Navegação via `PainelCard` também usa o mesmo `conversaId`

### Cenário de Erro
- Se `conversaId` for `null`, o botão/ícone fica com `cursor-not-allowed` e `opacity-50`, sem navegar

## Banco de Dados (se aplicável)

- Tabela: `conversations`
  - `id` (uuid) — ID da conversa, usado para montar a URL `/chat?conversa=<id>`
  - `contact_id` (uuid) — chave estrangeira para `contacts`, usada para relacionar pipeline_card → conversa

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — adicionar campo `conversaId: string | null` nos tipos `CardLead` e `CardCliente`
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — fazer join com `conversations` pelo `contact_id` nas funções `listarCardsExpansao` e `listarCardsRetencao`, incluindo `conversaId` no objeto retornado
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — no botão `MessageSquare`, usar `useRouter().push('/chat?conversa=<conversaId>')` ao clicar; desabilitar se `conversaId` for null
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — no botão "Abrir conversa", usar `useRouter().push('/chat?conversa=<conversaId>')` ao clicar; desabilitar se `conversaId` for null
- **Modificar:** `src/app/(auth)/chat/page.tsx` — ler `searchParams.conversa` (Server Component) e passar como prop `conversaInicialId` para `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — aceitar prop `conversaInicialId?: string | null` e chamar `handleConversaClick(conversaInicialId)` no `useEffect` inicial, apenas se a conversa existir na lista

## Checklist

- [x] Adicionar `conversaId: string | null` aos tipos `CardLead` e `CardCliente` em `mock-pipeline.ts`
- [x] Atualizar `listarCardsExpansao` em `actions.ts` para fazer join com `conversations` e retornar `conversaId`
- [x] Atualizar `listarCardsRetencao` em `actions.ts` para fazer join com `conversations` e retornar `conversaId`
- [x] Atualizar botão `MessageSquare` em `card-lead.tsx` para navegar para `/chat?conversa=<conversaId>` (desabilitado se null)
- [x] Atualizar botão "Abrir conversa" em `painel-card.tsx` para navegar para `/chat?conversa=<conversaId>` (desabilitado se null)
- [x] Ler `searchParams.conversa` em `chat/page.tsx` e passar como `conversaInicialId` para `ChatLayout`
- [x] Aceitar e processar `conversaInicialId` em `chat-layout.tsx` para abrir a conversa automaticamente
