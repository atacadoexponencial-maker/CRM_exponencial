# 08: Abrir painel lateral ao clicar em um card

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar a abertura do painel lateral de detalhes ao clicar em um card do kanban. O painel deve carregar as informações do card selecionado (dados do contato, etapa atual, atendente, histórico e notas) e exibir ao lado do kanban sem fechar a tela.

O `painel-card.tsx` já existe como protótipo (issue 03) com dados mockados. Esta issue substitui os mocks por dados reais: histórico de etapas e notas internas buscados do Supabase ao abrir o painel. Também conecta o painel ao Funil de Retenção, que hoje não tem o painel wired.

---

## Cenários

### Happy Path
1. Usuário clica em um card do Funil de Expansão → painel abre à direita com os dados do card
2. Enquanto busca histórico e notas, o painel exibe estado de carregamento
3. Histórico exibe as etapas anteriores do card com data e responsável
4. Notas exibem as notas internas do card com autor e data
5. O mesmo fluxo funciona no Funil de Retenção
6. Clicar fora do painel ou no botão "X" fecha o painel

### Edge Cases
- Card sem histórico → exibe "Nenhum histórico disponível."
- Card sem notas → exibe "Nenhuma nota ainda."
- Falha ao buscar dados → exibe estado vazio sem travar a tela

### Cenário de Erro
Não aplicável — a busca é silenciosa; falha exibe estado vazio.

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_card_history`
  - `id` (uuid, PK)
  - `card_id` (uuid, FK pipeline_cards ON DELETE CASCADE)
  - `de_etapa` (text, nullable) — etapa de origem; null para o registro inicial
  - `para_etapa` (text) — etapa de destino
  - `alterado_por` (uuid, FK profiles)
  - `created_at` (timestamptz)
  - RLS SELECT: usuário tem acesso ao card pai

- Tabela: `pipeline_card_notes`
  - `id` (uuid, PK)
  - `card_id` (uuid, FK pipeline_cards ON DELETE CASCADE)
  - `workspace_id` (uuid, FK workspaces) — para RLS
  - `texto` (text)
  - `autor_id` (uuid, FK profiles)
  - `created_at` (timestamptz)
  - RLS SELECT: workspace_id = workspace_id do usuário

---

## Arquivos

- **Criar:** `supabase/migrations/20260526000003_create_pipeline_card_history_and_notes.sql` — tabelas `pipeline_card_history` e `pipeline_card_notes` com RLS
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `buscarDadosPainel(cardId: string): Promise<{ historico: HistoricoEtapa[]; notas: NotaInterna[] }>` com joins de profiles para nome do autor/alterador
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — remover `MOCK_PAINEL_DATA`; adicionar prop `funil?: "expansao" | "retencao"` (default `"expansao"`); usar `useEffect` + `buscarDadosPainel(card.id)` para carregar dados reais; mostrar etapas do funil correto no dropdown; exibir loading enquanto busca
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — importar `PainelCard`; adicionar estado `cardSelecionado: CardLead | null`; renderizar `<PainelCard card={cardSelecionado} funil="retencao" onFechar={...} />`; passar `onCardClick={setCardSelecionado}` para cada `ColunaKanban`

> Reutilizar: tipos `HistoricoEtapa` e `NotaInterna` de `./mock-pipeline`; `createClient` de `@/integrations/supabase/server`; `ETAPAS_EXPANSAO` e `ETAPAS_RETENCAO` de `../mock-pipeline`.

---

## Checklist

- [x] Criar `supabase/migrations/20260526000003_create_pipeline_card_history_and_notes.sql`: tabela `pipeline_card_history` (id, card_id ON DELETE CASCADE, de_etapa, para_etapa, alterado_por, created_at) com política RLS SELECT via exists em pipeline_cards; tabela `pipeline_card_notes` (id, card_id ON DELETE CASCADE, workspace_id, texto, autor_id, created_at) com política RLS SELECT por workspace_id
- [x] Adicionar `buscarDadosPainel(cardId)` em `actions.ts`: busca `pipeline_card_history` + join de profiles (nome do alterador); busca `pipeline_card_notes` + join de profiles (nome do autor); retorna `{ historico: HistoricoEtapa[]; notas: NotaInterna[] }`
- [x] Modificar `painel-card.tsx`: remover import de `MOCK_PAINEL_DATA`; adicionar prop `funil?: "expansao" | "retencao"`; adicionar `useState` para `painelData` e `carregando`; usar `useEffect` chamando `buscarDadosPainel(card.id)` ao abrir o painel; mostrar spinner/vazio enquanto carrega; usar etapas corretas no dropdown (ETAPAS_EXPANSAO ou ETAPAS_RETENCAO conforme `funil`)
- [x] Modificar `funil-retencao.tsx`: importar `PainelCard` de `./painel-card`; adicionar `useState<CardLead | null>(null)` para `cardSelecionado`; renderizar `<PainelCard card={cardSelecionado} funil="retencao" onFechar={() => setCardSelecionado(null)} />`; adicionar `onCardClick={setCardSelecionado}` em cada `<ColunaKanban>`; importar `type CardLead` de `../mock-pipeline`
