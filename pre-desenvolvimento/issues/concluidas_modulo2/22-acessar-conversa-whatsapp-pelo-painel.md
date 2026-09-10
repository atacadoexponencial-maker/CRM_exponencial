# 22: Acessar conversa de WhatsApp pelo botão do painel

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar o botão "Abrir conversa" no painel do card. Ao clicar, o usuário é redirecionado para a conversa de WhatsApp do contato no módulo de Chat, com a conversa já aberta.

> **Nota:** Esta funcionalidade já estava implementada quando a issue foi planejada. Nenhuma modificação é necessária.

## Cenários

### Happy Path
1. Usuário abre o painel de um card que possui `conversaId`
2. Botão "Abrir conversa" está habilitado
3. Usuário clica — é redirecionado para `/chat?conversa=<id>`
4. O módulo de Chat abre com a conversa do contato já selecionada

### Edge Cases
- Card sem `conversaId` (contato sem conversa no WhatsApp): botão desabilitado e visualmente acinzentado
- Conversa não está na lista visível do usuário (ex.: atendente não atribuído): o `useEffect` não encontra a conversa na lista e nada abre — comportamento silencioso aceitável

### Cenário de Erro
- Nenhum cenário de erro aplicável: o redirecionamento é local via `router.push`

## Arquivos

> Nenhum arquivo precisa ser criado ou modificado — a funcionalidade já está implementada nos arquivos abaixo:
>
> - `src/app/(auth)/pipeline/components/painel-card.tsx:264–278` — botão "Abrir conversa" com `router.push('/chat?conversa=...')` e disable quando sem `conversaId`
> - `src/app/(auth)/chat/page.tsx:17–18` — lê `?conversa=` dos `searchParams` e passa como `conversaInicialId`
> - `src/app/(auth)/chat/components/chat-layout.tsx:111–116` — `useEffect` que abre automaticamente a conversa ao receber `conversaInicialId`

## Checklist

- [x] Botão "Abrir conversa" existe no painel do card
- [x] Botão desabilitado quando card não tem `conversaId`
- [x] Navegação para `/chat?conversa=<id>` ao clicar
- [x] Página `/chat` lê o parâmetro `conversa` dos searchParams
- [x] `ChatLayout` abre automaticamente a conversa via `conversaInicialId`
