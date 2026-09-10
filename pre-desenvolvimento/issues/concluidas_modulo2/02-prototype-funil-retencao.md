# 02: Prototype — Funil de Retenção

**Tipo:** Protótipo
**Página:** Funil de Retenção

## Descrição

Criar o protótipo visual da página do Funil de Retenção com layout kanban em colunas (Em Onboarding, Cliente Ativo, Aguardando Recompra, Recompra Realizada, Em Risco, Inativo, Perdido), seletor de funil, campo de busca, filtro de atendente e cards com dados mockados — incluindo os indicadores visuais de alerta nas colunas "Em Risco", "Inativo" e "Perdido".

---

## Cenários

### Happy Path
1. Usuário acessa `/pipeline/retencao`
2. Vê o kanban com 7 colunas horizontais, cada uma com nome da etapa e contagem de cards
3. Colunas "Em Risco", "Inativo" e "Perdido" exibem indicador visual de alerta (borda ou ícone colorido)
4. Cada card exibe: nome do cliente, atendente responsável (ou "Sem atendente"), tempo na etapa e etiquetas
5. Campo de busca filtra os cards visíveis em tempo real
6. Filtro de atendente reduz os cards exibidos por responsável
7. Abas "Expansão" e "Retenção" no topo — "Retenção" ativa, "Expansão" leva para `/pipeline`

### Edge Cases
- Coluna sem nenhum card → exibe estado vazio ("Nenhum cliente nesta etapa")
- Busca sem resultados → todas as colunas ficam vazias com mensagem discreta
- Filtro de atendente sem resultados → colunas ficam vazias

### Cenário de Erro
Não aplicável — protótipo com dados mockados, sem chamadas de rede.

---

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

---

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — adicionar `EtapaRetencao`, `CardCliente` e `MOCK_CARDS_RETENCAO` com ao menos 10 cards distribuídos nas 7 colunas; também adicionar `ETAPAS_RETENCAO` com flag `alerta` nas etapas de risco
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — adicionar prop opcional `alertaVisual?: boolean` que exibe indicador de cor vermelha/laranja no cabeçalho da coluna
- **Criar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — layout client com abas, busca, filtro de atendente e as 7 colunas; reutiliza `ColunaKanban` com `alertaVisual` nas colunas de risco; reutiliza `CardLeadItem` para exibir os cards
- **Criar:** `src/app/(auth)/pipeline/retencao/page.tsx` — server component que passa `MOCK_CARDS_RETENCAO` para `FunilRetencao`

> Reutilizar: `ColunaKanban` de `./coluna-kanban`, `CardLeadItem` de `./card-lead`, `Button` de `@/components/ui/button`, `cn` de `@/lib/utils`, ícones de `lucide-react`.

---

## Checklist

- [x] Adicionar em `mock-pipeline.ts`: tipo `EtapaRetencao`, interface `CardCliente`, constante `ETAPAS_RETENCAO` (com campo `alerta: boolean`) e array `MOCK_CARDS_RETENCAO` com ao menos 10 cards nas 7 colunas
- [x] Adicionar prop `alertaVisual?: boolean` em `ColunaKanban` — quando verdadeira, exibir borda superior ou ícone de alerta vermelho/laranja no cabeçalho
- [x] Criar `funil-retencao.tsx` com abas Expansão/Retenção (Retenção ativa), busca, filtro de atendente e 7 colunas kanban; colunas "Em Risco", "Inativo" e "Perdido" passam `alertaVisual={true}`
- [x] Criar `retencao/page.tsx` como server component passando `MOCK_CARDS_RETENCAO` para `FunilRetencao`
