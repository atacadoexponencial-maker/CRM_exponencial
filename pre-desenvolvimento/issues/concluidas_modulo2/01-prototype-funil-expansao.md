# 01: Prototype — Funil de Expansão

**Tipo:** Protótipo
**Página:** Funil de Expansão

## Descrição

Criar o protótipo visual da página do Funil de Expansão com layout kanban em colunas (Lead, Em Qualificação, Catálogo Enviado, Em Negociação, Primeira Compra), seletor de funil (abas Expansão/Retenção), campo de busca, filtro de atendente, botão "Novo lead" e cards com dados mockados.

---

## Cenários

### Happy Path
1. Usuário acessa `/pipeline`
2. Vê o kanban com 5 colunas horizontais, cada uma com nome da etapa e contagem de cards
3. Cada card exibe: nome do contato, atendente responsável (ou "Sem atendente"), tempo na etapa e etiquetas
4. Ícone de link para conversa aparece em cada card
5. Campo de busca filtra os cards visíveis em tempo real
6. Filtro de atendente reduz os cards exibidos por responsável
7. Abas "Expansão" e "Retenção" no topo permitem navegar entre funis
8. Botão "Novo lead" aparece no cabeçalho (sem funcionalidade neste protótipo)
9. Cards sem atendente exibem indicador visual diferenciado

### Edge Cases
- Coluna sem nenhum card → exibe estado vazio ("Nenhum lead nesta etapa")
- Busca sem resultados → todas as colunas ficam vazias com mensagem discreta
- Filtro de atendente sem resultados → colunas ficam vazias

### Cenário de Erro
Não aplicável — protótipo com dados mockados, sem chamadas de rede.

---

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

---

## Arquivos

- **Criar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — tipos TypeScript e dados mockados dos cards
- **Criar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — card individual do kanban
- **Criar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — coluna com nome da etapa, contagem e lista de cards
- **Criar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — layout client: abas, busca, filtro, colunas e botão "Novo lead"
- **Criar:** `src/app/(auth)/pipeline/page.tsx` — server component que passa mock data para o layout
- **Modificar:** `src/app/(auth)/layout.tsx` — adicionar link "Pipeline" na navegação

> Reutilizar: `Button` de `@/components/ui/button`, `cn` de `@/lib/utils`, padrão de ícones com `lucide-react`.

---

## Checklist

- [x] Criar `mock-pipeline.ts` com tipos `EtapaExpansao`, `CardLead` e array `MOCK_CARDS_EXPANSAO` com ao menos 8 cards distribuídos nas 5 colunas
- [x] Criar `card-lead.tsx` exibindo nome do contato, atendente (ou "Sem atendente" em destaque), tempo na etapa, etiquetas coloridas e ícone de conversa (MessageSquare do lucide)
- [x] Criar `coluna-kanban.tsx` com título da etapa, badge de contagem e lista de cards verticais com scroll independente
- [x] Criar `funil-expansao.tsx` com abas Expansão/Retenção, campo de busca, filtro de atendente, botão "Novo lead" e as 5 colunas em layout horizontal com scroll
- [x] Criar `page.tsx` como server component (sem redirect — protótipo) passando mock data
- [x] Adicionar link "Pipeline" em `layout.tsx` antes do link "Chat"
