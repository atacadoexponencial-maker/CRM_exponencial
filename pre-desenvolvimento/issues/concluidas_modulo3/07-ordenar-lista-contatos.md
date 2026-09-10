# 07: Ordenar Lista de Contatos

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Usuário seleciona o critério de ordenação (mais recente, nome A–Z, classificação) e a lista reordena os contatos de acordo.

> **Nota:** O dropdown de ordenação e as lógicas para "Nome (A–Z)" e "Classificação" já existem em `lista-contatos.tsx` (do protótipo). O trabalho desta issue é: (1) adicionar `created_at` ao tipo `Contato` e ao fetch, e (2) implementar o caso `"recente"` no `useMemo` de ordenação.

## Cenários

### Happy Path
1. Usuário acessa `/contatos` — lista exibe contatos ordenados por "Mais recente" (padrão, `created_at DESC`)
2. Usuário abre o dropdown de ordenação e seleciona "Nome (A–Z)" — lista reordena alfabeticamente
3. Usuário seleciona "Classificação" — lista reordena por: Ativo → Lead → Em Risco → Inativo → Perdido → Sem histórico
4. Usuário volta para "Mais recente" — lista volta à ordem por data de criação

### Edge Cases
- Ordenação se mantém enquanto o usuário aplica outros filtros simultaneamente
- Contatos com mesmo nome (ordem "Nome A–Z"): ordem estável, sem saltos
- Contatos com mesma classificação (ordem "Classificação"): sub-ordem por nome dentro do grupo

### Cenário de Erro
- Não aplicável — ordenação é puramente client-side; sem chamada ao backend

## Banco de Dados

Não aplicável — `created_at` já existe na tabela `contacts`. Apenas precisa ser incluído no SELECT.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — adicionar `created_at: string` à interface `Contato`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adicionar `created_at` ao `CONTACT_SELECT` e ao `mapContato`
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — adicionar caso `"recente"` no `useMemo` de ordenação (sort por `created_at` DESC)

## Checklist

- [x] Adicionar `created_at: string` à interface `Contato` em `mock-contatos.ts`
- [x] Adicionar `created_at` ao `CONTACT_SELECT` e ao `mapContato` em `actions.ts`
- [x] Implementar `else if (ordenacao === "recente")` no `useMemo` de `lista-contatos.tsx` com sort por `created_at` DESC
