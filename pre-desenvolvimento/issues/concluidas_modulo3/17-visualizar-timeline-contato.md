# 17: Visualizar Timeline do Contato

**Tipo:** Implementação
**Página:** Timeline do Contato

## Descrição

Usuário acessa a aba de timeline e visualiza todos os eventos (conversas, movimentações de pipeline, notas, compras, edições cadastrais) em ordem cronológica decrescente, com ícone e cor diferente por tipo de evento.

## Cenários

### Happy Path
1. Usuário abre o perfil de um contato e clica na aba "Timeline"
2. Vê uma lista cronológica decrescente de eventos reais do banco
3. Pode filtrar por tipo de evento usando os botões de filtro já existentes

### Edge Cases
- Sem eventos: exibe "Nenhum evento registrado" (já implementado no componente)
- Filtro sem resultados: exibe "Nenhum evento encontrado para este filtro" (já implementado)
- Contato sem cards no pipeline: queries de `pipeline_card_history` e `pipeline_card_notes` retornam vazio

### Cenário de Erro
- Não há cenário de erro na UI — se a query falhar, `timeline` fica vazio e exibe a mensagem de empty state

## Banco de Dados

Leitura das tabelas existentes (sem migrations novas):
- `conversations` — `id, created_at, assigned_to, profiles!assigned_to(name)`
- `pipeline_cards` — `id, created_at, funil, etapa, atendente_id, profiles!pipeline_cards_atendente_id_fkey(name)`
- `pipeline_card_history` — `id, created_at, card_id, de_etapa, para_etapa, alterado_por, profiles!alterado_por(name)`
- `pipeline_card_notes` — `id, created_at, card_id, texto, autor_id, profiles!autor_id(name)`
- `contact_purchases` — `id, created_at, valor` (já buscado)

O tipo `dados_editados` não tem tabela de auditoria no banco — não será emitido pela timeline real.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/actions.ts` — atualizar a query de `pipeline_cards` para incluir `id, created_at` e nome do atendente; após a query principal, rodar segunda rodada paralela com `conversations`, `pipeline_card_history` e `pipeline_card_notes` usando os card IDs; montar `EventoTimeline[]` com todos os eventos ordenados por data desc

## Checklist

- [x] `actions.ts`: atualizar select de `pipeline_cards` para incluir `id, created_at, atendente_id, profiles(name)`
- [x] `actions.ts`: buscar `conversations` do contato (evento `conversa_iniciada`)
- [x] `actions.ts`: buscar `pipeline_card_history` pelos card IDs do contato (evento `mudanca_etapa`)
- [x] `actions.ts`: buscar `pipeline_card_notes` pelos card IDs do contato (evento `nota_interna`)
- [x] `actions.ts`: montar eventos `card_criado` e `compra_registrada` dos dados já buscados
- [x] `actions.ts`: mesclar todos os eventos, ordenar por `created_at` desc, mapear para `EventoTimeline[]` e retornar em `timeline`
