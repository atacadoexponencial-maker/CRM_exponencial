# 21: Adicionar nota interna ao card

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar o campo e botão para adicionar notas internas ao card no painel lateral. A nota é salva com o texto, o nome do autor e a data de criação. As notas são visíveis para todos os usuários do workspace com acesso ao card, mas não são enviadas ao contato via WhatsApp.

## Cenários

### Happy Path
1. Usuário digita texto no textarea "Adicionar nota interna..."
2. Botão "Adicionar nota" fica habilitado
3. Usuário clica no botão — aparece estado de carregamento (disabled)
4. A nota é salva no banco (`pipeline_card_notes`)
5. O textarea é limpo e a lista de notas é atualizada com a nova nota no final

### Edge Cases
- Texto com apenas espaços em branco: botão permanece desabilitado (`trim() === ""`)
- Card sem notas anteriores: lista vazia, nova nota aparece após salvar

### Cenário de Erro
- Falha na action: botão volta ao estado normal, textarea mantém o texto digitado

## Banco de Dados

- Tabela: `pipeline_card_notes` (já existe)
  - `card_id` (uuid) — referência ao card
  - `workspace_id` (uuid) — isolamento RLS
  - `texto` (text) — conteúdo da nota
  - `autor_id` (uuid) — quem criou
  - `created_at` (timestamptz) — data de criação
- **Faltante:** política `INSERT` no RLS — a tabela tem `SELECT` mas sem `INSERT`, qualquer tentativa de salvar será bloqueada pelo Supabase

## Arquivos

- **Criar:** `supabase/migrations/20260530000000_pipeline_card_notes_insert_policy.sql` — política INSERT no RLS para membros do workspace inserirem notas
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `adicionarNota(cardId: string, texto: string): Promise<void>`
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — conectar `onClick` do botão à action, adicionar `salvandoNota` state, limpar textarea e re-fetch após sucesso

## Checklist

- [x] Migration com política INSERT em `pipeline_card_notes`
- [x] Server action `adicionarNota` em `actions.ts`
- [x] `onClick` no botão "Adicionar nota" chamando a action
- [x] Estado `salvandoNota` desabilitando o botão durante o envio
- [x] Limpar textarea após sucesso
- [x] Re-fetch das notas após salvar (reutilizar `buscarDadosPainel`)
