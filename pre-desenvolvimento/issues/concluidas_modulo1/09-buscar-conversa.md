# 09: Buscar Conversa por Nome ou Telefone

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar o campo de busca na caixa de entrada que filtra conversas por nome do contato ou número de telefone, atualizando a lista em tempo real conforme o usuário digita.

## Cenários

### Happy Path
1. Usuário digita "Ana" no campo de busca — lista exibe apenas conversas cujo nome do contato contém "ana" (case-insensitive)
2. Usuário digita "+55 11" — lista exibe conversas cujo telefone contém esse trecho
3. Usuário apaga o texto — lista volta a exibir todas as conversas
4. Busca combina com filtros de status, visibilidade e etiqueta simultaneamente

### Edge Cases
- Contato sem nome (`nome === null`): busca usa o telefone como fallback para comparar com o termo
- Busca com espaços em branco apenas (ex.: "   "): lista não é filtrada — `.trim()` ignora
- Termo com letras maiúsculas: busca é case-insensitive (`.toLowerCase()` em ambos os lados)
- Nenhuma conversa corresponde ao termo: exibe "Nenhuma conversa encontrada"

### Cenário de Erro
- Não aplicável — filtro é local sobre dados em memória, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`).

## Arquivos

> **Nota:** Esta feature já está implementada no protótipo (issue #01). Nenhum arquivo novo precisa ser criado ou modificado.

- **Verificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — confirmar que o campo de busca filtra por nome e telefone em tempo real

## Checklist

- [x] Confirmar que o campo de busca existe com ícone de lupa e placeholder "Buscar conversa..."
- [x] Confirmar que digitar filtra a lista em tempo real (sem submit)
- [x] Confirmar que a busca funciona por nome do contato (case-insensitive)
- [x] Confirmar que a busca funciona por número de telefone
- [x] Confirmar que contato sem nome usa telefone como fallback na busca
- [x] Confirmar que busca com apenas espaços não filtra nada
- [x] Confirmar que "Nenhuma conversa encontrada" aparece quando não há resultados
