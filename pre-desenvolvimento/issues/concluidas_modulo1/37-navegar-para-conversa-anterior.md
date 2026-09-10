# 37: Navegar para Conversa Anterior do Contato

**Tipo:** Implementação
**Página:** Contato Básico

## Descrição

Implementar a navegação ao clicar em uma conversa anterior na lista do painel de contato: o painel de chat muda para exibir o histórico da conversa selecionada.

## Cenários

### Happy Path
1. Usuário abre uma conversa e clica no nome do contato para abrir o painel lateral
2. O painel exibe a lista de conversas anteriores do contato
3. Usuário clica em uma conversa anterior
4. O painel de chat principal muda para exibir as mensagens da conversa selecionada
5. O painel de contato fecha (comportamento natural: `PainelConversa` remonta com nova key)

### Edge Cases
- Conversa anterior cujas mensagens já foram carregadas: reutiliza cache (`mensagensLocais`)
- Conversa anterior com status "resolvida": navega normalmente (o server carrega todas as conversas sem filtro de status para admin/gerente)
- Atendente clicando numa conversa não atribuída a ele: o id não está em `conversasState`, `conversaAtiva` fica `null` e nada é exibido — comportamento aceitável para este escopo

### Cenário de Erro
- Se `buscarMensagens` falhar para a conversa selecionada: exibe a mensagem de erro já existente em `chat-layout.tsx` ("Erro ao carregar mensagens")

## Banco de Dados (se aplicável)

Nenhuma alteração necessária.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — adicionar prop `onNavegar`, habilitar os botões de conversa anterior e disparar navegação no clique
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar prop `onNavegar` e repassá-la para `PainelContato`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — passar `onNavegar={handleConversaClick}` para `PainelConversa`

## Checklist

- [x] Adicionar `onNavegar: (id: string) => void` à interface `PainelContatoProps` em `painel-contato.tsx`
- [x] Remover `disabled`, `opacity-70` e `cursor-not-allowed` dos botões de conversas anteriores em `painel-contato.tsx`
- [x] Adicionar `onClick={() => onNavegar(c.id)}` e estilos hover interativos nos botões em `painel-contato.tsx`
- [x] Adicionar `onNavegar: (id: string) => void` à interface `PainelConversaProps` em `painel-conversa.tsx`
- [x] Passar `onNavegar` para `<PainelContato>` em `painel-conversa.tsx`
- [x] Passar `onNavegar={handleConversaClick}` para `<PainelConversa>` em `chat-layout.tsx`
