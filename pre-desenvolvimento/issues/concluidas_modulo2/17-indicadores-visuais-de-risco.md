# 17: Indicadores visuais de alerta nos cards do Funil de Retenção

**Tipo:** Implementação
**Página:** Funil de Retenção

## Descrição

Implementar os indicadores visuais diferenciados nos cards do Funil de Retenção: cards nas colunas "Em Risco" e "Inativo" exibem cor de alerta, e cards na coluna "Perdido" exibem cor neutra/cinza. Os demais cards seguem o estilo padrão.

## Cenários

### Happy Path
- Card com `etapa === "em_risco"` exibe borda esquerda vermelha e fundo vermelho sutil
- Card com `etapa === "inativo"` exibe borda esquerda vermelha e fundo vermelho sutil
- Card com `etapa === "perdido"` exibe borda esquerda cinza e opacidade reduzida
- Cards com outras etapas seguem o estilo padrão (`bg-card border-border`)

### Edge Cases
- Cards do Funil de Expansão nunca terão `em_risco`, `inativo` ou `perdido` como etapa — o componente os renderiza normalmente sem nenhuma das classes de alerta
- Card com `sem atendente` e etapa `em_risco`/`inativo` aplica ambos os estilos simultaneamente (a borda-left de alerta sobrescreve a amber)

### Cenário de Erro
- Não aplicável — apenas estilo CSS condicional, sem chamadas assíncronas

## Banco de Dados

Não aplicável.

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — adicionar classes condicionais no container do card baseadas em `card.etapa`: vermelho para `em_risco`/`inativo`, cinza para `perdido`

## Dependências Externas

Nenhuma.

## Checklist

- [x] Em `card-lead.tsx`, adicionar lógica de classe condicional no `cn(...)` do container: `em_risco` e `inativo` → `border-l-2 border-l-red-500 bg-red-500/5`; `perdido` → `border-l-2 border-l-muted-foreground/40 opacity-60`
- [x] Garantir que o indicador "sem atendente" (borda amber) não entre em conflito visual — para etapas de alerta, a borda vermelha prevalece (remover a borda amber quando a etapa for de alerta)
