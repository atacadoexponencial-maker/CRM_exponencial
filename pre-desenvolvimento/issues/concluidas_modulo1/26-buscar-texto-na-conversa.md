# 26: Buscar Texto dentro da Conversa

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a busca de texto dentro da conversa: ao usar o campo de busca, o sistema destaca todas as ocorrências do termo no histórico de mensagens e permite navegar entre elas.

> **Nota de planejamento:** filtro, destaque e contador básico já existem em `painel-conversa.tsx`. O que falta é a **navegação prev/next** entre as ocorrências filtradas, com contador "X de N" e scroll automático para o resultado atual.

## Cenários

### Happy Path
1. Usuário clica no ícone de lupa — barra de busca abre com foco automático
2. Usuário digita um termo — apenas mensagens que contêm o termo são exibidas com o texto destacado em amarelo; contador exibe "1 de N"
3. Usuário clica ↓ (próximo) — contador avança para "2 de N" e a área de mensagens faz scroll até o próximo resultado
4. Usuário clica ↑ (anterior) — contador recua e scroll vai ao resultado anterior
5. Usuário clica X ou pressiona Esc — busca fecha, termo é limpo, todas as mensagens voltam

### Edge Cases
- Sem resultados: contador exibe "0 resultados", botões prev/next desabilitados
- 1 resultado: botões prev/next desabilitados (não há para onde navegar)
- `indiceAtual` é resetado para 0 sempre que `termoBusca` muda
- Busca é case-insensitive e já ignora acentos por `toLowerCase()`
- Ao trocar de conversa, busca é fechada e termo limpo (já acontece no `useEffect([conversa.id])`)

### Cenário de Erro
- Nenhum cenário de erro — operação puramente local de UI

## Banco de Dados

Não aplicável.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar estado `indiceAtual`, botões ChevronUp/ChevronDown na barra de busca, refs para cada mensagem filtrada, useEffect para scroll, contador "X de N"

## Checklist

- [x] Estado `indiceAtual: number` adicionado, iniciado em 0
- [x] `indiceAtual` resetado para 0 sempre que `termoBusca` muda (useEffect)
- [x] Refs array (`resultsRef`) criado para capturar o elemento DOM de cada mensagem filtrada
- [x] Botões ChevronUp e ChevronDown adicionados à barra de busca
- [x] Botões desabilitados quando `mensagensFiltradas.length <= 1`
- [x] Clique em ↓ avança `indiceAtual` (com wrap-around) e faz scroll para o elemento
- [x] Clique em ↑ recua `indiceAtual` (com wrap-around) e faz scroll para o elemento
- [x] Contador exibe "X de N" quando `termoBusca` está ativo e há resultados, ou "0 resultados" quando vazio
- [x] `useEffect([indiceAtual])` chama `scrollIntoView({ block: "center" })` no elemento atual
