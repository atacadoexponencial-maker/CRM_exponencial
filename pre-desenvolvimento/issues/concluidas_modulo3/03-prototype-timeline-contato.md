# 03: Protótipo — Timeline do Contato

**Tipo:** Protótipo
**Página:** Timeline do Contato

## Descrição

Criar a UI estática da aba de timeline dentro do Perfil do Contato, exibindo lista de eventos em ordem cronológica decrescente com ícone de tipo, descrição e responsável, além do filtro por tipo de evento.

## Cenários

### Happy Path
1. Usuário acessa `/contatos/c1` e vê as abas "Dados" e "Timeline"
2. Usuário clica na aba "Timeline"
3. Lista de eventos é exibida em ordem cronológica decrescente
4. Cada evento mostra: data/hora, ícone do tipo, rótulo do tipo, descrição e nome do responsável
5. Usuário clica num filtro de tipo de evento — lista exibe apenas eventos daquele tipo
6. Usuário remove o filtro clicando em "Todos" — lista volta ao completo

### Edge Cases
- Nenhum evento na timeline: exibe "Nenhum evento registrado"
- Filtro ativo sem resultados: exibe "Nenhum evento encontrado para este filtro"
- Contato sem pipeline (c9): timeline não exibe eventos de pipeline

### Cenário de Erro
- (Protótipo — sem chamadas reais)

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — adicionar tipo `EventoTimeline` e campo `timeline: EventoTimeline[]` em `ContatoPerfil`, com dados mockados para c1 (6+ eventos de tipos variados) e c2 (2–3 eventos)
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — adicionar navegação de abas ("Dados" / "Timeline") e renderizar `TimelineContato` na aba correspondente
- **Criar:** `src/app/(auth)/contatos/[id]/components/timeline-contato.tsx` — Client Component com lista de eventos filtrada, filtros por tipo de evento e estado vazio

## Checklist

- [x] Adicionar `EventoTimeline` (id, data, tipo, descricao, responsavel) e `TIPOS_EVENTO` ao `mock-contatos.ts`; adicionar campo `timeline` em `ContatoPerfil`; popular `MOCK_PERFIS_CONTATO` com eventos variados em c1 e c2
- [x] Modificar `perfil-contato.tsx` para exibir abas "Dados" / "Timeline" e alternar entre o conteúdo atual e `<TimelineContato />`
- [x] Criar `timeline-contato.tsx` com lista de eventos cronológicos (ícone, tipo, descrição, responsável, data), filtros por tipo e estado vazio
