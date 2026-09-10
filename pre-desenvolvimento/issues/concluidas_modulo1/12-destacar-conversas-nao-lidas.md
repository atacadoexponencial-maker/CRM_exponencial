# 12: Destacar Conversas com Mensagens Não Lidas

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar o destaque visual em negrito das conversas que possuem mensagens não lidas, removendo o destaque assim que o usuário abre e lê a conversa.

## Cenários

### Happy Path
1. Lista exibe conversas com `naoLidas > 0` com nome em `font-semibold` e badge numérico
2. Usuário clica na conversa — ao abrir, o destaque em negrito some e o badge desaparece
3. Outras conversas não abertas mantêm seus destaques inalterados

### Edge Cases
- Conversa com `naoLidas === 0`: já exibe `font-medium` sem badge, clicar não muda nada
- Recarregar a página: dados mock voltam ao estado original (não há persistência no protótipo)

### Cenário de Erro
- Não aplicável — lógica é local, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`).

## Arquivos

- **Verificar:** `src/app/(auth)/chat/components/item-conversa.tsx` — destaque `font-semibold` e badge já implementados
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — adicionar estado `abertas: Set<string>`; criar `handleConversaClick(id)` que chama `setConversaAtivaId(id)` e adiciona o id ao set; calcular `conversasComLeitura` sobrescrevendo `naoLidas` para `0` nas conversas abertas; passar `conversasComLeitura` para `<FiltrosCaixa>` no lugar de `conversas`

## Checklist

- [x] Confirmar que nome em `font-semibold` e badge aparecem para conversas com `naoLidas > 0` (já existia)
- [x] Ao clicar em uma conversa com não lidas, o badge some e o nome volta a `font-medium`
- [x] Clicar em uma conversa sem não lidas não altera o visual de nenhuma outra conversa
- [x] Estado `abertas` é um `Set<string>` inicializado vazio em `chat-layout.tsx`
- [x] `handleConversaClick` adiciona o id ao set antes de passar para `FiltrosCaixa`
