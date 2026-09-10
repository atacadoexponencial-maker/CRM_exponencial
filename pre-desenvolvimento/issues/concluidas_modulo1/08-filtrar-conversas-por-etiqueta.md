# 08: Filtrar Conversas por Etiqueta

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar o filtro por etiqueta na caixa de entrada, exibindo apenas as conversas que possuem a etiqueta selecionada.

## Cenários

### Happy Path
1. Usuário acessa a caixa de entrada — "Todas etiquetas" está ativo por padrão (sem filtro)
2. Usuário clica em "Recompra" — lista exibe apenas conversas com etiqueta `"Recompra"`
3. Usuário clica na mesma etiqueta novamente — filtro é removido, volta para "Todas etiquetas"
4. Usuário clica em outra etiqueta ("VIP") — lista filtra por "VIP"
5. Usuário clica em "Todas etiquetas" — filtro de etiqueta é limpo

### Edge Cases
- Filtro de etiqueta combina com filtro de status e filtro de visibilidade simultaneamente
- Se nenhuma conversa tiver a etiqueta selecionada, exibe "Nenhuma conversa encontrada"
- Conversas sem etiquetas não aparecem ao selecionar qualquer etiqueta

### Cenário de Erro
- Não aplicável — filtro é local sobre dados em memória, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`).

## Arquivos

> **Nota:** Esta feature já está implementada no protótipo (issue #01). Nenhum arquivo novo precisa ser criado ou modificado.

- **Verificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — confirmar que os botões de etiqueta filtram a lista corretamente e que o toggle funciona

## Checklist

- [x] Confirmar que o botão "Todas etiquetas" existe e está ativo por padrão
- [x] Confirmar que clicar em uma etiqueta filtra a lista para conversas que a possuem
- [x] Confirmar que clicar na etiqueta ativa a deseleciona (toggle)
- [x] Confirmar que o botão ativo tem estilo visual distinto (font-medium)
- [x] Confirmar que o filtro combina corretamente com os filtros de status e visibilidade
- [x] Confirmar que "Nenhuma conversa encontrada" aparece quando o filtro não retorna resultados
