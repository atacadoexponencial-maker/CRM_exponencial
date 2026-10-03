# B14-02: Etapas novas Follow do Catálogo, Nutrição e Perdido

**Tipo:** Implementação
**Página:** Funil de Entrada, painel do card, Dashboard, Alertas, Perfil do contato, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-entrada.md` — seções "O que cada etapa faz" e, nos módulos, tudo o que se refere a Follow do Catálogo, Nutrição e Perdido
**Depende de:** B14-01

## Descrição

Acrescentar as três etapas novas ao Funil de Entrada — **Follow do Catálogo**
(`follow_catalogo`), **Nutrição** (`nutricao`) e **Perdido** (`perdido`) — na ordem
Lead → Sondagem → Catálogo Enviado → Follow do Catálogo → Negociação → Nutrição → Ganho →
Perdido. Follow do Catálogo e Nutrição são etapas de trabalho sem regra embutida.
Perdido é coluna normal, sem motivo, com o destaque visual do Perdido da Recompra:
não gera alerta, não conta como lead ativo e pode voltar para qualquer etapa. No
dashboard, Follow do Catálogo vira degrau do gráfico de conversão; Nutrição e Perdido
não são degraus, e o card nelas conta pelas etapas por onde passou.

## Pronto quando

No CRM publicado, o Funil de Entrada mostra as 8 colunas na ordem nova (rolando para o
lado quando não cabem); dá para arrastar um card para Follow do Catálogo, Nutrição e
Perdido e de volta; card em Perdido some dos alertas e de "leads ativos" e volta a contar
quando sai de lá; card em Nutrição continua gerando "lead sem resposta"; o gráfico de
conversão vai de Lead a Ganho passando por Follow do Catálogo; e as três etapas aparecem
para escolha nos gatilhos e ações das automações e com o nome certo no perfil do contato.

## Cenários

### Happy Path
1. **Migration** (aplicada antes do deploy, só acrescenta): a regra de
   `pipeline_cards.etapa` passa a aceitar `follow_catalogo` e `nutricao`. (`perdido` já
   é aceito, por causa da Recompra.) Nenhum dado muda.
2. **Deploy**: o Funil de Entrada mostra as 8 colunas na ordem Lead → Sondagem →
   Catálogo Enviado → Follow do Catálogo → Negociação → Nutrição → Ganho → Perdido, com
   rolagem lateral quando não cabem (o quadro já tem `overflow-x-auto`).
3. A coluna Perdido aparece com o destaque vermelho e o ícone de alerta das colunas
   Em Risco/Inativo/Perdido da Recompra (`ColunaKanban` com `alertaVisual`).
4. O usuário arrasta um card para Follow do Catálogo ou Nutrição: o card muda de etapa,
   ganha linha no histórico; nada mais acontece (sem sequência, sem card na Recompra).
5. Arrasta para Perdido: o card muda de etapa sem pedir motivo; some da Central de
   Alertas e deixa de contar em "leads ativos" no dashboard.
6. Arrasta de Perdido para outra etapa: volta a ser lead ativo e volta a poder gerar
   "lead sem resposta".
7. Dashboard: o gráfico de conversão tem 6 degraus — Lead, Sondagem, Catálogo Enviado,
   Follow do Catálogo, Negociação, Ganho. Card em Nutrição ou Perdido conta pelas etapas
   do histórico.
8. Painel do card e tela de automações: as 8 etapas aparecem para escolha (as duas leem
   `ETAPAS_ENTRADA`); perfil do contato e alertas mostram os nomes certos.

### Edge Cases
- **Card em Nutrição sem histórico além de Lead**: conta só no degrau Lead (o índice de
  etapa fora dos degraus cai em 0, que todo card já atinge).
- **Card que foi para Ganho e depois para Perdido**: o histórico diz que ele chegou em
  Ganho, mas a spec diz que card em Perdido nunca conta como convertido. Regra: card
  **atualmente** em Perdido não conta no degrau Ganho nem em "convertidos" (dashboard e
  performance por vendedor); os degraus anteriores contam pelo histórico.
- **Card em Nutrição continua gerando "lead sem resposta"** pelo limiar configurado
  (decisão aprovada com a spec).
- **`perdido` existe nos dois funis**: os mapas de nome têm uma chave `perdido` só
  ("Perdido") — o rótulo é igual nos dois, então não há conflito. Os alertas da
  Recompra para `perdido` não mudam (a regra nova filtra `funil === "entrada"`).
- **Classificação do contato**: card em Perdido no Funil de Entrada continua "Lead"
  (`calcularClassificacao` só olha `perdido` no card da Recompra) — sem mudança.
- **Esqueleto de carregamento** (`loading.tsx`) desenha 5 colunas genéricas: não muda
  (é só placeholder, não lista etapas).

### Cenário de Erro
- Mover para etapa nova antes da migration: o banco recusa e o `moverCard` devolve erro
  como hoje — por isso a migration vai antes do deploy.
- **Volta atrás**: promover no Vercel o deploy anterior; mover para outra etapa os cards
  que estiverem em `follow_catalogo`/`nutricao`/`perdido` do Funil de Entrada; a regra
  pode ficar como está (aceitar valores a mais não quebra o código antigo).

## Banco de Dados

- Tabela: `pipeline_cards`
  - `etapa` (text, check) — passa a aceitar também `follow_catalogo` e `nutricao`
- Migration: `supabase/migrations/20261003000003_etapas_entrada_follow_nutricao.sql`
  (aplicar antes do deploy; só acrescenta valores)

## Arquivos

- **Criar:** `supabase/migrations/20261003000003_etapas_entrada_follow_nutricao.sql` — regra aceita `follow_catalogo` e `nutricao`
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — tipo `EtapaEntrada` com os 3 valores novos; `ETAPAS_ENTRADA` com as 8 etapas na ordem nova e `alerta: true` em Perdido (mesmo formato de `ETAPAS_RECOMPRA`)
- **Modificar:** `src/app/(auth)/pipeline/components/funil-entrada.tsx` — passar `alertaVisual={etapa.alerta}` para `ColunaKanban`, como em `funil-recompra.tsx`
- **Modificar:** `src/lib/alertas.ts` — nomes de Follow do Catálogo e Nutrição; card de Entrada em `perdido` não gera "lead sem resposta"
- **Modificar:** `src/lib/metricas-dashboard.ts` — `ETAPAS_FUNIL` com Follow do Catálogo; leads ativos sem `perdido`; card atual em `perdido` não conta como convertido (gráfico e performance)
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — nomes de Follow do Catálogo, Nutrição e Perdido em `ETAPA_ENTRADA_LABEL` e de Follow/Nutrição em `ETAPA_LABEL_ALL`
- **Modificar:** `src/test/metricas-dashboard.test.ts` — índices do gráfico com 6 degraus; casos: Perdido fora de leads ativos, Ganho→Perdido não convertido, Nutrição conta pelo histórico
- **Modificar:** `src/test/sequencias.test.ts` — casos: card em Perdido não gera alerta, card em Nutrição gera

> Reuso: `ColunaKanban` já tem `alertaVisual`; o painel do card e a tela de automações
> leem `ETAPAS_ENTRADA` e passam a listar as 8 etapas sem mudança.

## Checklist

- [x] Migration criada e aplicada (`npx supabase db push --linked`) antes do push
- [x] `mock-pipeline.ts`: tipo e `ETAPAS_ENTRADA` com as 8 etapas; Perdido com `alerta: true`
- [x] `funil-entrada.tsx`: coluna Perdido com destaque visual
- [x] `alertas.ts`: nomes novos; Perdido (Entrada) sem "lead sem resposta"; Nutrição continua gerando
- [x] `metricas-dashboard.ts`: 6 degraus; leads ativos sem Perdido; Perdido nunca convertido
- [x] `contatos/actions.ts`: nomes das 3 etapas
- [x] Testes novos e existentes passando
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: `next start` + Playwright com workspace temporário — 8 colunas, Perdido destacado, mover para Follow/Nutrição/Perdido e de volta, dashboard com 6 degraus (03/10: alerta some em Perdido e volta ao sair; nada criado na Recompra; timeline do perfil com os nomes novos; workspaces apagados)
- [x] Commit + push (`7a14c31`); deploy Ready (03/10)
