# 36: Visualizar Histórico de Conversas do Contato

**Tipo:** Implementação
**Página:** Contato Básico

## Descrição

Implementar a lista de conversas anteriores do mesmo contato no painel lateral, exibindo data e preview da última mensagem de cada conversa, buscando do Supabase.

## Cenários

### Happy Path
1. Usuário abre o painel lateral de um contato
2. O sistema busca as conversas anteriores do mesmo contato no Supabase
3. Cada item da lista exibe: status (colorido), data contextual da última mensagem e preview do texto
4. Data contextual: hoje → hora (09:42), ontem → "Ontem", últimos 7 dias → nome do dia, mais antigo → "15 abr. 2025"

### Edge Cases
- Contato sem conversas anteriores: exibe "Nenhuma conversa anterior"
- Conversa com `last_message_at` muito antigo: exibe data completa formatada

### Cenário de Erro
- Erro na query: exibe "Erro ao carregar" já tratado pelo `erroInfo` existente

## Banco de Dados

- Tabela: `conversations`
  - `id`, `status`, `last_message_text`, `last_message_at`, `contact_id` — já usados pela query existente

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — corrigir formatação de `ultimaMensagemHorario` em `buscarInfoContato`: substituir `toLocaleTimeString` por lógica de data contextual (hoje=hora, ontem="Ontem", semana=dia, antigo=data)

## Checklist

- [x] Corrigir `ultimaMensagemHorario` em `buscarInfoContato` para usar data contextual em vez de hora fixa
