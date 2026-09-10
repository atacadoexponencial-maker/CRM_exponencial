# 11: Exibir Classificação Derivada do Pipeline

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Sistema calcula e exibe a classificação do contato (Lead, Ativo, Em Risco, Inativo, Perdido, Sem histórico) com base na etapa atual dos cards de pipeline, com precedência do Funil de Retenção; a classificação não é editável.

## Cenários

### Happy Path
1. Usuário acessa o perfil de um contato que tem card no Funil de Retenção na etapa "cliente_ativo"
2. Sistema busca `pipeline_cards` com `contact_id = id` do contato
3. Encontra card de Retenção → deriva classificação como "Ativo"
4. Badge "Ativo" (verde) exibido no cabeçalho do perfil e nos dados

### Edge Cases
- Contato com card em Expansão E Retenção simultaneamente: Retenção tem precedência
- Contato com card em Retenção "recompra_realizada": classificado como "Ativo"
- Contato com card em Expansão qualquer etapa (incluindo "primeira_compra"): sem card de Retenção → classificado como "Lead"
- Contato sem nenhum card: exibe "Sem histórico"

### Cenário de Erro
- Falha ao buscar pipeline_cards: retorna `classificacao: "sem_historico"` e `cards: []` como fallback

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `contact_id` (uuid) — vínculo com o contato
  - `funil` (text) — `"expansao"` ou `"retencao"`
  - `etapa` (text) — etapa atual do card

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/actions.ts` — enriquecer `buscarDadosContato` para: (1) consultar `pipeline_cards` filtrando por `contact_id`, (2) derivar `classificacao` via função auxiliar `calcularClassificacao`, (3) popular `cards` com funil + etapaLabel mapeada

## Checklist

- [x] Adicionar query de `pipeline_cards` em `buscarDadosContato` (filtrar por `contact_id`)
- [x] Implementar função pura `calcularClassificacao(cards)` seguindo regras da spec (Retenção tem precedência)
- [x] Substituir `c.classificacao` pelo valor derivado
- [x] Popular array `cards` com `{ funil, etapaLabel }` para cada card encontrado
- [x] Mapear etapas para labels legíveis (reutilizar mapeamento inline, sem importar mock-pipeline)
