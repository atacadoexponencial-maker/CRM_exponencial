# 10: Abrir Painel de Conversa

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar a navegação ao clicar em uma conversa na lista: o painel de chat da conversa selecionada é aberto e a conversa fica destacada na lista como ativa.

## Cenários

### Happy Path
1. Usuário acessa `/chat` — painel direito exibe "Selecione uma conversa para começar"
2. Usuário clica em uma conversa na lista — `PainelConversa` é exibido com os dados da conversa selecionada
3. A conversa clicada fica com fundo `bg-muted` na lista (destaque de ativa)
4. Usuário clica em outra conversa — painel troca para a nova conversa e o destaque muda

### Edge Cases
- Clicar na conversa já ativa: o painel recarrega (prop `key={conversa.id}` garante re-mount apenas na troca)
- Lista filtrada: clicar em uma conversa filtrada funciona normalmente

### Cenário de Erro
- Não aplicável — navegação é local, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`).

## Arquivos

> **Nota:** Esta feature já está implementada no protótipo (issue #01). Nenhum arquivo novo precisa ser criado ou modificado.

- **Verificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — confirmar estado `conversaAtivaId`, renderização condicional do `PainelConversa` e placeholder
- **Verificar:** `src/app/(auth)/chat/components/item-conversa.tsx` — confirmar que prop `ativa` aplica estilo de destaque
- **Verificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — confirmar que `ativa` e `onConversaClick` são passados corretamente para `ItemConversa`

## Checklist

- [x] Confirmar que a página exibe "Selecione uma conversa para começar" quando nenhuma conversa está ativa
- [x] Confirmar que clicar em uma conversa abre o `PainelConversa` com os dados corretos
- [x] Confirmar que a conversa ativa fica com `bg-muted` na lista
- [x] Confirmar que clicar em outra conversa troca o painel e move o destaque
- [x] Confirmar que `key={conversa.id}` está no `PainelConversa` para garantir re-mount na troca
