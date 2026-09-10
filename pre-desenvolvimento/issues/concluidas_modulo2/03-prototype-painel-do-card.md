# 03: Prototype — Painel do Card

**Tipo:** Protótipo
**Página:** Painel do Card

## Descrição

Criar o protótipo visual do painel lateral que abre ao clicar em um card do pipeline. O painel deve exibir: nome e número do contato, etapa e funil atual, atendente responsável, tempo no funil, histórico de etapas, etiquetas, lista de notas internas, campo de nova nota, botão "Abrir conversa" e dropdown de mudança de etapa — tudo com dados mockados.

---

## Cenários

### Happy Path
1. Usuário clica em qualquer card do kanban de Expansão
2. Um painel lateral desliza da direita e exibe os dados do card selecionado
3. Painel mostra: nome e telefone do contato, etapa atual com label, funil "Expansão", atendente (ou "Sem atendente"), tempo no funil, etiquetas coloridas
4. Seção de histórico de etapas exibe lista de etapas anteriores com data
5. Seção de notas internas exibe lista de notas com autor e data
6. Campo de nova nota aceita texto e tem botão "Adicionar nota" (sem ação real no protótipo)
7. Dropdown de mudança de etapa exibe as 5 etapas do funil (sem ação real)
8. Botão "Abrir conversa" exibe ícone MessageSquare (sem ação real)
9. Clicar fora do painel ou no botão "X" fecha o painel

### Edge Cases
- Card sem atendente → painel exibe "Sem atendente" com destaque âmbar
- Card sem etiquetas → seção de etiquetas não exibe nada (ou oculta a seção)
- Campo de nova nota vazio → botão "Adicionar nota" desabilitado ou sem ação

### Cenário de Erro
Não aplicável — protótipo com dados mockados, sem chamadas de rede.

---

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

---

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — adicionar tipos `HistoricoEtapa` e `NotaInterna` e mapa `MOCK_PAINEL_DATA` com histórico e notas para ao menos 2 cards
- **Criar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — painel lateral com todos os campos descritos; recebe `card: CardLead | null` e `onFechar: () => void`
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — adicionar prop `onPainelAbrir?: () => void` chamada no `onClick` do div raiz
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — adicionar prop `onCardClick?: (card: CardLead) => void` e passá-la para `CardLeadItem`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — adicionar estado `cardSelecionado`, renderizar `PainelCard` quando um card for selecionado, passar `onCardClick` para `ColunaKanban`

> Reutilizar: `cn` de `@/lib/utils`, ícones de `lucide-react`, `ETAPAS_EXPANSAO` de `../mock-pipeline`. Não criar nenhum novo componente UI genérico.

---

## Checklist

- [x] Adicionar em `mock-pipeline.ts`: tipos `HistoricoEtapa` e `NotaInterna`; constante `MOCK_PAINEL_DATA` (Record<string, { historico: HistoricoEtapa[]; notas: NotaInterna[] }>) com dados para os cards de id "1" e "4"
- [x] Criar `painel-card.tsx`: painel lateral fixo à direita com botão de fechar, seções de info do contato, etapa/funil, atendente, tempo, etiquetas, histórico de etapas, notas e campo de nova nota com botão desabilitado se vazio
- [x] Modificar `card-lead.tsx`: adicionar prop `onPainelAbrir?: () => void` e chamar no `onClick` do div raiz (sem quebrar o botão MessageSquare que já chama `stopPropagation`)
- [x] Modificar `coluna-kanban.tsx`: adicionar prop `onCardClick?: (card: CardLead) => void` e passar `() => onCardClick?.(card)` para `CardLeadItem` como `onPainelAbrir`
- [x] Modificar `funil-expansao.tsx`: adicionar `useState<CardLead | null>(null)` para `cardSelecionado`, renderizar `<PainelCard>` quando não nulo, passar `onCardClick` para cada `ColunaKanban`
