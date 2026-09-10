# 07: Filtrar Conversas por Status

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar os filtros de status na caixa de entrada: Todas, Em espera, Em atendimento e Resolvidas — atualizando a lista de conversas conforme a opção selecionada.

## Cenários

### Happy Path
1. Usuário acessa a caixa de entrada — filtro "Todas" está ativo por padrão
2. Usuário clica em "Em espera" — lista exibe somente conversas com `status === "em_espera"`
3. Usuário clica em "Em atendimento" — lista exibe somente `status === "em_atendimento"`
4. Usuário clica em "Resolvidas" — lista exibe somente `status === "resolvida"`
5. Usuário clica em "Todas" — lista exibe todas as conversas (sem filtro de status)

### Edge Cases
- Filtro de status combina com filtro de visibilidade e filtro de etiqueta simultaneamente
- Se nenhuma conversa corresponder ao status selecionado, exibe "Nenhuma conversa encontrada"

### Cenário de Erro
- Não aplicável — filtro é local sobre dados em memória, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`).

## Arquivos

> **Nota:** Esta feature já está implementada no protótipo (issue #01). Nenhum arquivo novo precisa ser criado ou modificado.

- **Verificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — confirmar que os botões de status filtram a lista corretamente
- **Verificar:** `src/app/(auth)/chat/mock-conversas.ts` — confirmar que `FiltroStatus` cobre todos os valores necessários

## Checklist

- [x] Confirmar que os 4 botões de status existem: Todas, Em espera, Em atendimento, Resolvidas
- [x] Confirmar que clicar em cada botão filtra a lista corretamente
- [x] Confirmar que o botão ativo tem estilo visual distinto (bg-primary)
- [x] Confirmar que "Nenhuma conversa encontrada" aparece quando o filtro não retorna resultados
