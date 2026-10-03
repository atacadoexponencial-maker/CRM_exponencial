# B15-02: Cores das colunas do Funil de Recompra

**Tipo:** Implementação
**Página:** Funil de Recompra
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-recompra.md` — seção "Cores das colunas"
**Depende de:** B15-01

## Descrição

Cada coluna do Funil de Recompra ganha a cor da régua no título e na borda, sem emoji:
Onboarding e Reposição neutras; Ativos verde; Ativos RI amarelo; Inativos cinza;
Inativos RP laranja; Perdidos vermelho. Substitui o vermelho com ícone de alerta que hoje
marca as colunas de risco.

## Pronto quando

No CRM publicado, o Funil de Recompra mostra cada coluna com a sua cor, legível no tema
escuro, e o Funil de Entrada continua como está (Perdido de lá segue com o destaque
vermelho da B14-02).

## Cenários

### Happy Path
1. O usuário abre o Funil de Recompra: Onboarding e Reposição com a borda e o título
   neutros de hoje; Ativos com borda e título verdes; Ativos RI amarelos; Inativos cinza
   (claro o bastante para não se confundir com o neutro); Inativos RP laranja; Perdidos
   vermelhos.
2. Nenhuma coluna da Recompra mostra mais o ícone de alerta (triângulo) — a cor basta.
3. O Funil de Entrada não muda: a coluna Perdido de lá continua vermelha com o ícone
   (`alertaVisual`, B14-02).

### Edge Cases
- **Tema sempre escuro** (o CRM não ativa variantes `dark:`): as cores usam o padrão já
  usado na coluna de alerta — borda `-500/40` e texto `-400` —, legíveis no fundo escuro.
- **Tailwind 4**: as classes ficam escritas inteiras num mapa fixo (sem montar nome de
  classe por texto), para o Tailwind encontrá-las.
- **Destaque do card** (`card-lead.tsx`, borda vermelha nos cards de Ativos RI, Inativos
  e Inativos RP): fica como está — esta issue é só da coluna.
- **Esqueleto de carregamento**: sem cor (placeholder), não muda.

### Cenário de Erro
- Sem cenário de erro: é só apresentação; nenhum dado nem regra muda.

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — nova prop opcional `cor` (`verde`, `amarelo`, `cinza`, `laranja`, `vermelho`) com classes de borda e título num mapa fixo; `alertaVisual` continua para o Funil de Entrada
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — `ETAPAS_RECOMPRA` troca `alerta` por `cor` (Onboarding e Reposição sem cor)
- **Modificar:** `src/app/(auth)/pipeline/components/funil-recompra.tsx` — passa `cor={etapa.cor}` no lugar de `alertaVisual`

## Checklist

- [x] `ColunaKanban` aceita `cor` com as 5 cores; `alertaVisual` intacto (o tipo `CorColuna` ficou em `mock-pipeline.ts`, que a coluna já importa — evita import circular)
- [x] `ETAPAS_RECOMPRA` com `cor` por etapa, sem `alerta`
- [x] `funil-recompra.tsx` passa a cor
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: `next start` + Playwright — captura do Funil de Recompra com as 7 cores e do Funil de Entrada sem mudança (03/10: 5 cores + 2 neutras, sem ícone na Recompra; Perdido da Entrada vermelho com ícone; workspace apagado)
- [ ] Commit + push; deploy Ready
